document.getElementById('highlight').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      document.body.innerHTML = document.body.innerHTML.replace(/AI/g, '<mark>AI</mark>');
    }
  });
});
