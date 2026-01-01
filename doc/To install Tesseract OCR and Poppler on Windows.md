To install Tesseract OCR and Poppler on Windows, follow these steps:

  Install Tesseract OCR

   1. Download Tesseract Installer: Go to the official Tesseract OCR GitHub page for Windows installers, typically found under the   
      "Tesseract at UB Mannheim" section: https://tesseract-ocr.github.io/tessdoc/Installation.html
      (https://tesseract-ocr.github.io/tessdoc/Installation.html)
       * Look for a tesseract-ocr-w64-setup-vX.XX.XX.exe file (for 64-bit Windows) and download it.
   2. Run the Installer:
       * Execute the downloaded .exe file.
       * Follow the on-screen prompts. Ensure you select "Add to PATH" or similar option during installation, or manually add the    
         Tesseract installation directory (e.g., C:\Program Files\Tesseract-OCR) to your system's PATH environment variable.
       * You might want to select additional language data if you plan to OCR documents in languages other than English.

  Install Poppler (for PDF processing)

  Poppler is often distributed as pre-compiled binaries for Windows.

   1. Download Poppler for Windows: A common place to get these binaries is from sites like the one hosted by xpdfreader:
      https://xpdfreader.com/download.html (https://xpdfreader.com/download.html)
       * Look for a link like "Poppler for Windows" or "Poppler utilities" and download the .zip file.
   2. Extract and Add to PATH:
       * Extract the contents of the downloaded .zip file to a location on your hard drive, for example, C:\poppler.
       * Inside the extracted folder, there should be a bin directory (e.g., C:\poppler\poppler-XXX\bin). You need to add this bin   
         directory to your system's PATH environment variable.
           * How to add to PATH:
               * Search for "Environment Variables" in your Windows search bar and select "Edit the system environment variables."   
               * Click the "Environment Variables..." button.
               * Under "System variables," find and select the Path variable, then click "Edit."
               * Click "New" and add the full path to your Poppler bin directory (e.g., C:\poppler\poppler-23.08.0\bin).
               * Click "OK" on all windows to save the changes.
   3. Verify Installation: Open a new command prompt or PowerShell window (changes to PATH only apply to new sessions) and type:     
       * tesseract -v
       * pdftotext -v
       * If both commands return version information without errors, they are successfully installed and configured.