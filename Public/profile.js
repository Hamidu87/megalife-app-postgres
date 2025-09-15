// This script WAITS for the layout to be ready, then handles profile picture logic.
function initializeProfileUploader() {
    console.log("'layoutReady' event received. Initializing profile uploader.");

    // Find the elements in the now-loaded sidebar
    const fileUploadInput = document.getElementById('file-upload');
    const profilePicImg = document.getElementById('profile-pic');
    const token = localStorage.getItem('token');

    // This check is important. If these elements don't exist, stop.
    if (!fileUploadInput || !profilePicImg || !token) {
        return;
    }
    
    fileUploadInput.addEventListener('change', async () => {
        const file = fileUploadInput.files[0];
        if (!file) return;

        const formData = new FormData();
        // 'profilePic' must match upload.single('profilePic') in your server.js
        formData.append('profilePic', file); 

        try {
            const response = await fetch('http://localhost:3000/user/upload-picture', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });

    if (!response.ok) throw new Error('Upload failed on server.');

    const result = await response.json();
    
    // THIS IS THE CRITICAL FIX FOR DISPLAYING THE IMAGE:
    // The browser needs the path relative to the Public root folder.
    const imagePathForBrowser = result.filePath; // e.g., 'uploads/filename.png'
    
    if (profilePicImg) {
        profilePicImg.src = imagePathForBrowser;
    }
    alert('Profile picture updated!');

} catch (error) {
    console.error('Error uploading picture:', error);
    alert('Failed to upload profile picture.');
        }
    });
}

// THIS IS THE KEY:
// The script does nothing until it hears the 'layoutReady' signal from layout.js.
document.addEventListener('layoutReady', initializeProfileUploader);