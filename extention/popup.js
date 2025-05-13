
document.addEventListener('DOMContentLoaded', () => {
  // Функция для подсветки "AI"
  function highlightAI() {
    document.body.innerHTML = document.body.innerHTML.replace(/(AI)/g, '<mark>$1</mark>');
  }

  // Функция для сбора H1, H2, H3
  function collectHeaders() {
    return Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText).join('\n');
  }

  // highlight AI button
  document.getElementById('highlight').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: highlightAI
    });
  });

  // collect headers button
  document.getElementById('collect').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectHeaders
    });

    if (results && results[0] && results[0].result !== undefined) {
      document.getElementById('output').value = results[0].result;
    }
  });
});


/*
document.getElementById('highlight').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      const walk = (node) => {
        if (node.nodeType === 3) { // Текстовый узел
          const replaced = node.nodeValue.replace(/(AI)/gi, '<span class="highlight">$1</span>');
          if (replaced !== node.nodeValue) {
            const wrapper = document.createElement('span');
            wrapper.innerHTML = replaced;
            node.replaceWith(...wrapper.childNodes);
          }
        } else if (node.nodeType === 1 && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
          for (const child of node.childNodes) {
            walk(child);
          }
        }
      };

      walk(document.body);

      if (!document.getElementById('ai-highlight-style')) {
        const style = document.createElement('style');
        style.id = 'ai-highlight-style';
        style.textContent = `.highlight { background: yellow; color: black; }`;
        document.head.appendChild(style);
      }
    },
  });
});
*/

