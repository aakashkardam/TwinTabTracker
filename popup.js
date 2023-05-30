// popup.js

// Function to update the UI with duplicate tab information
function updateUIWithDuplicates(duplicates) {
  const duplicatesContainer = document.getElementById('duplicates');

  // Clear existing content
  duplicatesContainer.innerHTML = '';

  if (duplicates.length === 0) {
    const noDuplicatesMessage = document.createElement('p');
    noDuplicatesMessage.textContent = 'No duplicate tabs found.';
    duplicatesContainer.appendChild(noDuplicatesMessage);
  } else {
    for (const duplicate of duplicates) {
      const duplicateTab = document.createElement('div');
      duplicateTab.classList.add('tab');

      const title = document.createElement('p');
      title.textContent = duplicate.title;

      const url = document.createElement('p');
      url.textContent = duplicate.url;

      duplicateTab.appendChild(title);
      duplicateTab.appendChild(url);
      duplicatesContainer.appendChild(duplicateTab);
    }
  }
}

// Get duplicate tabs
chrome.runtime.sendMessage({ action: 'getDuplicates' }, function (response) {
  const duplicates = response.duplicates;
  updateUIWithDuplicates(duplicates);
});

// Open URL in existing tab if available
document.addEventListener('DOMContentLoaded', function () {
  const openUrlButton = document.getElementById('open-url');

  openUrlButton.addEventListener('click', function () {
    const url = document.getElementById('url-input').value;

    chrome.runtime.sendMessage({ action: 'openUrl', url: url }, function (response) {
      if (response.success) {
        // Close the popup
        window.close();
      } else {
        // Handle error (e.g., URL not found)
        console.error(response.error);
      }
    });
  });
});

