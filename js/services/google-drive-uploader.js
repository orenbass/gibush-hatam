(function() {
  if (window.GoogleDriveUploader) return;

  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxa7PQhm5paLGvvf7bDNjxLHPjMWfXDUso-exppkkzv53-9Hb3waV6Gj2Kepxmizjw/exec';

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64 = reader.result.split(',')[1];
          if (!base64) {
            // Handle cases where result is null or doesn't contain a comma
            reject(new Error('Failed to convert blob to base64.'));
            return;
          }
          resolve(base64);
        } catch(e){ 
          reject(e); 
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function upload(blob, fileName, opts = {}) {
    try {
      if (!APPS_SCRIPT_URL) throw new Error('Missing APPS_SCRIPT_URL');

      let blobToUpload = blob;
      if (blobToUpload && typeof blobToUpload.then === 'function') {
        console.warn('upload(): got a Promise instead of Blob – awaiting it.');
        blobToUpload = await blobToUpload;
      }

      if (!(blobToUpload instanceof Blob)) {
        console.error('upload(): expected Blob, got:', blobToUpload);
        throw new Error('exportToExcel did not return a valid Blob object.');
      }

      console.log('Uploader: blob size =', blobToUpload.size, 'type =', blobToUpload.type);
      if (blobToUpload.size === 0) {
        throw new Error('The generated file is empty.');
      }
      
      const base64String = await blobToBase64(blobToUpload);
      console.log('Uploader: base64 length =', base64String.length);

      const finalFileName = fileName || opts.fileName || `GibushReport_${new Date().toLocaleDateString('en-CA').replace(/-/g,'')}.xlsx`;

      // Build payload with optional metadata (folder, type, overwrite, etc.)
      const payload = { fileName: finalFileName, base64: base64String, ...opts };

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('Google Script Response:', result);

      if (result.status !== 'success') {
        throw new Error(result.message || 'Unknown error from Google Script.');
      }

      return { status: 'success', message: `File "${result.fileName || finalFileName}" uploaded successfully!` };

    } catch (error) {
      console.error('Google Drive Upload Failed:', error);
      return { status: 'error', message: error.message || 'An unknown error occurred during upload.' };
    }
  }

  window.GoogleDriveUploader = { upload };
})();
// ודא שאין שום קוד נוסף אחרי שורה זו
