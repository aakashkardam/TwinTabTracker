// background.js

// Store the open tabs
let openTabs = [];

// Function to check for duplicate tabs
function checkDuplicateTabs() {
  chrome.tabs.query({}, function (tabs) {
    const currentTab = tabs[tabs.length - 1]; // Get the most recently created tab
    const currentUrl = currentTab.url;

    for (const tab of tabs) {
      if (tab.url === currentUrl && tab.id !== currentTab.id) {
        // Redirect to the existing tab
        chrome.tabs.update(tab.id, { active: true });
        chrome.tabs.remove(currentTab.id);
        return; // Exit the function
      }
    }
  });
}

// Event listener for tab creation
chrome.tabs.onCreated.addListener(function (tab) {
  openTabs.push(tab);
  checkDuplicateTabs();
});

// Event listener for tab removal
chrome.tabs.onRemoved.addListener(function (tabId) {
  openTabs = openTabs.filter((tab) => tab.id !== tabId);
  checkDuplicateTabs();
});

// Event listener for tab activation
chrome.tabs.onActivated.addListener(function (activeInfo) {
  checkDuplicateTabs();
});
