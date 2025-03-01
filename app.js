// Global variables
let tableData = [];
let headers = [];
let lnSumLimit = 25;

const dropArea = document.getElementById('drop-area');
const output = document.getElementById('output');

document.addEventListener('DOMContentLoaded', () => {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropArea.addEventListener('drop', handleFileUpload, false);
    document.getElementById("add-grade-btn").addEventListener("click", addNewGrade);
    document.getElementById("add-grade-form").style.display = "none";

    const fileElem = document.getElementById('fileElem');
    fileElem.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && file.type === "application/pdf") {
            resetTableData(); // Reset before processing new PDF
            const reader = new FileReader();
            reader.onload = function(e) {
                const typedarray = new Uint8Array(e.target.result);
                extractTextFromPDF(typedarray);
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert("Please upload a valid PDF file.");
        }
    });

    document.getElementById("update-ln-sum").addEventListener("click", updateLnSum);
    document.getElementById("ln-sum").value = lnSumLimit;
});

// Utility functions
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    dropArea.classList.add('border-tha');
    dropArea.classList.add('bg-tha/5');
}

function unhighlight() {
    dropArea.classList.remove('border-tha');
    dropArea.classList.remove('bg-tha/5');
}

function updateLnSum() {
    const newValue = parseInt(document.getElementById("ln-sum").value, 10);
    if (!isNaN(newValue) && newValue >= 0) {
        lnSumLimit = newValue;
        if (tableData.length > 0)
            displayTable(); // Recalculate and update display
    }
}

// PDF handling functions from pdfHandler.js
function resetTableData() {
    tableData = [];
    headers = [];
}

function handleFileUpload(event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
        resetTableData(); // Reset before processing new PDF
        const reader = new FileReader();
        reader.onload = function(e) {
            const typedarray = new Uint8Array(e.target.result);
            extractTextFromPDF(typedarray);
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert("Please upload a valid PDF file.");
    }
}

function extractTextFromPDF(typedarray) {
  pdfjsLib
    .getDocument(typedarray)
    .promise.then((pdf) => {
      const textContent = [];
      const numPages = pdf.numPages;
      let promiseChain = Promise.resolve();
      let foundPrufNr = false;
      let foundBearbeiter = false;

      for (let i = 1; i <= numPages; i++) {
        promiseChain = promiseChain.then(() =>
          pdf.getPage(i).then((page) => {
            return page
              .getTextContent()
              .then((text) => {
                textContent[i] = "";
                text.items.forEach((item) => {
                  if (item.str.includes("Prüf.Nr.")) {
                    foundPrufNr = true;
                    console.log("Found PrufNr");
                  }
                  if (item.str.includes("Bearbeiter")) {
                    foundBearbeiter = true;
                    console.log("Found Bearbeiter");
                  }
                  if (foundPrufNr && !foundBearbeiter) {
                    textContent[i] += item.str + "\n";
                  }
                });
              })
              .then(() => {
                // handle multiple pages
                const textItems = textContent[i].split("\n");
                if (i < numPages) {
                  // remove footer from first page
                  textContent[i] = textItems.splice(0, textItems.length - 6);
                } else {
                  // remove table header after first page
                  textContent[i] = textItems.splice(14);
                }
                textContent[i] = textContent[i].join("\n");
              });
          })
        );
      }

      promiseChain.then(() => {
        getTableData(textContent.join("\n"));
        displayTable();
      });
    })
    .catch((error) => {
      console.error("Error extracting text from PDF: ", error);
    });
}

function getTableData(text) {
  const lines = text
    .trim()
    .split("\n")
    .filter((line) => line.trim() !== "");
  console.log(lines);

  headers = lines.slice(0, 7).map((header) => header.trim());
  const rows = getRows(lines.slice(7));

  rows.forEach((row) =>
    tableData.push({
      Nummer: row[0].trim(),
      Name: row[1].trim(),
      Art: row[2].trim(),
      Semester: row[3].trim(),
      Note: parseFloat(row[4].replace(",", ".")),
      ECTS: parseInt(row[5], 10),
      Status: row[6].trim(),
    })
  );
}

function getRows(rowData) {
  let rows = [];
  for (let i = 0; i < rowData.length; i += 7) {
    const row = rowData.slice(i, i + 7);
    if (!row[4].includes(",")) {
      // handle subjects without grades, e.g. "Programmieren 1 (BZV)", "Praktische Tätigkeit", "Praxis-Seminar", ...
      rows.push([...row.slice(0, 4), "0", ...row.slice(4, 6)]);
      i--;
    } else {
      rows.push(row);
    }
  }
  return rows;
}

function addNewGrade() {
    const newGrade = {
        "Nummer": -1,
        "Name": document.getElementById("new-name").value.trim(),
        "Art": document.getElementById("new-art").value.trim(),
        "Semester": "Future",
        "Note": parseFloat(document.getElementById("new-note").value),
        "ECTS": parseInt(document.getElementById("new-ects").value, 10),
        "Status": "BE"
    };

    tableData.push(newGrade);
    displayTable();

    document.querySelectorAll('#add-grade-form input').forEach(input => {
        input.value = '';
    });
}

function deleteGrade(index) {
    if (confirm('Are you sure you want to delete this grade?')) {
        tableData.splice(index, 1);
        displayTable();
    }
}

function calculateWeightedAverage(lnSum = 25){
    let totalWeight = 0;
    let weightedSum = 0;
    let lnGrades = tableData.filter(row => row.Note && row.ECTS && row.Status.includes("BE") && (row.Art === "LN"));
    let prGrades = tableData.filter(row => row.Note && row.ECTS && row.Status.includes("BE") && (row.Art === "PR"));

    lnGrades.sort((a, b) => b.Note - a.Note).reverse();
    console.log(lnGrades);

    let lnWeight = 0;
    let lnWeightedSum = 0;

    for (let grade of lnGrades) {
        if (lnWeight + grade.ECTS <= lnSum) {
            lnWeight += grade.ECTS;
            lnWeightedSum += grade.Note * grade.ECTS;
        } else {
            let remainingWeight = lnSum - lnWeight;
            lnWeightedSum += grade.Note * remainingWeight;
            lnWeight += remainingWeight;
            break;
        }
    }

    prGrades.forEach(grade => {
        totalWeight += grade.ECTS;
        weightedSum += grade.Note * grade.ECTS;
    });

    totalWeight += lnWeight;
    weightedSum += lnWeightedSum;

    const average = weightedSum / totalWeight;
    return [average, totalWeight];
}

function displayTable() {
    const outputArea = document.getElementById("output");
    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';
    
    const thead = document.createElement('thead');
    thead.className = 'bg-gray-50';
    const headerRow = document.createElement('tr');
    
    headers.forEach(header => {
        const th = document.createElement('th');
        th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
        th.textContent = header;
        headerRow.appendChild(th);
    });
    const actionHeader = document.createElement('th');
    actionHeader.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
    actionHeader.textContent = 'Actions';
    headerRow.appendChild(actionHeader);
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    tbody.className = 'bg-white divide-y divide-gray-200';
    tableData.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        Object.values(row).forEach(value => {
            const td = document.createElement('td');
            td.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900';
            td.textContent = value;
            tr.appendChild(td);
        });
        
        const actionsTd = document.createElement('td');
        actionsTd.className = 'px-6 py-4 whitespace-nowrap text-sm';
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.className = 'text-tha hover:text-tha/80';
        deleteBtn.onclick = () => deleteGrade(index);
        actionsTd.appendChild(deleteBtn);
        tr.appendChild(actionsTd);
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    const [average, totalWeight] = calculateWeightedAverage(lnSumLimit);
    const averageOutput = document.createElement('p');
    averageOutput.className = 'mt-4 p-4 text-lg font-semibold';
    averageOutput.textContent = `Weighted Average: ${average.toFixed(2)}, Total ECTS: ${totalWeight}`;
    
    outputArea.innerHTML = '';
    outputArea.appendChild(table);
    outputArea.appendChild(averageOutput);
    document.getElementById("add-grade-form").style.display = "block";
}