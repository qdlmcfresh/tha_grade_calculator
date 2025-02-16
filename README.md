# THA Grade Calculator

A web application that helps students of Technische Hochschule Augsburg calculate their grade average by extracting grades from official PDF transcripts and simulating future grades.

## Features

- 📄 PDF Transcript Processing
  - Drag and drop your official THA grade transcript
  - Automatic extraction of grades and course information
  - Supports the standard THA grade PDF format

- 📊 Grade Management
  - Display all courses in a clear table format
  - Add hypothetical future grades
  - Real-time grade average calculation
  - Weighted ECTS calculation

- 🧮 Smart Average Calculation
  - Considers course types (LN/PR)
  - Weighted calculation based on ECTS points

## Usage

1. Visit the [THA Grade Calculator](https://qdlmcfresh.github.io/tha_grade_calculator/)
2. Drag and drop your THA grade PDF into the designated area
3. View your current grades and average
4. Add potential future grades using the form below the table
5. See how new grades would affect your overall average

## Technical Details

- Built with vanilla JavaScript
- Uses PDF.js for PDF parsing
- No server-side processing - all calculations happen in your browser

## Privacy

This tool runs entirely in your browser. Your grade information is never uploaded to any server or stored permanently.

## Development

To run this project locally:

1. Clone the repository
2. Open `index.html` in your browser
3. Drop a THA grade PDF to test the functionality

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License