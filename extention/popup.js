
//const originUrl = 'https://viix.co'
const originUrl = 'http://127.0.0.1:8001';



function saveToken(user, email, token)
{
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  chrome.storage.local.set({
    aiveex: { user, token, email, expiresAt },
  }, () => {
    console.log("Token was saved for 7 days.");
  });
}

async function getStoredToken()
{
  return new Promise((resolve) => {
    chrome.storage.local.get("aiveex", (result) => {
      resolve(result.aiveex);
    });
  });
}

async function authenticate(statusEl, redirectUri)
{
  //chrome.tabs.create({ url: `${originUrl}/login` })

  chrome.identity.launchWebAuthFlow(
    {
      url: `${originUrl}/login?redirect_uri=${encodeURIComponent(redirectUri)}`,
      interactive: true,
    },
    (responseUrl) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        statusEl.textContent = "Authentication: undefined user";
        return;
      }

      const url = new URL(responseUrl);
      const token = url.searchParams.get("token");
      const email = url.searchParams.get("email");
      const user = url.searchParams.get("user");

      if (token && email && user) {
        console.log("Access Token:", token);
        console.log("Email:", email);
        statusEl.textContent = `${user}, ${email}`;
        saveToken(user, email, token);
      }
      else {
        statusEl.textContent = "Token not found in response";
      }
    }
  );
}

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById("status");
  if (!statusEl) {
    console.error("Element #status not found!");
    return;
  }

  const chromeExtIdEl = document.getElementById("chromeExtId");
  if (!statusEl) {
    console.error("Element #status not found!");
    return;
  }

  const redirectUri = chrome.identity.getRedirectURL("provider_cb");

  const chromeUri = chrome.identity.getRedirectURL();
  chromeExtIdEl.textContent = "ID: " + new URL(chromeUri).host.split(".")[0]

  const stored = await getStoredToken();

  if (stored && stored.token && stored.expiresAt > Date.now())
  {
    console.log("Using stored token:", stored.token);
    statusEl.textContent = `${stored.user}, ${stored.email}`;
  }
  else
  {
    console.log("No valid token found, starting authentication...");
    await authenticate(statusEl, redirectUri);
  }

  // highlight "AI"
  function highlightAI() {
    document.body.innerHTML = document.body.innerHTML.replace(/(AI)/g, '<mark>$1</mark>');
  }

  // collect H1, H2, H3
  function collectHeaders() {
    return Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText).join('\n');
  }

  // highlight AI button
  /*
  document.getElementById('highlight').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: highlightAI
    });
  });
  */

/*
  document.getElementById('send-url').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab.url;
    const content = document.getElementById('output').value;

    try {
      const response = await fetch(`${originUrl}/receive-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: currentUrl, content: content })
      });

      if (response.ok) {
        alert('URL sent successfully!');
        document.getElementById('output').value = '';
      }
      else {
        alert('Failed to send URL. Status: ' + response.status);
      }

    }
    catch (error)
    {
      console.error('Error sending URL:', error);
      alert('Error sending URL. See console.');
    }
  });
*/

/*
  document.getElementById('parse-html').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tag_name = document.getElementById('output').value;

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => document.documentElement.outerHTML,
    }, async (results) => {
      if (results && results[0]) {
        const pageHtml = results[0].result;
        const pageUrl = tab.url;

        try {
          const response = await fetch(`${originUrl}/parse-html`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: pageUrl, tag_name: tag_name, html: pageHtml })
          });

          const data = await response.json();
          if (response.ok)
          {
            document.getElementById('output').value = data.items_count
            alert('Page HTML sent successfully!');
          }
          else
          {
            alert('Failed to send HTML. Status: ' + response.status);
          }

        }
        catch (error)
        {
          console.error('Error sending HTML:', error);
          alert('Error sending HTML. See console.');
        }
      }
    });
  });
*/

  document.getElementById('save-selection').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const [{ result: selectionHtml }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        if (range) {
          const container = document.createElement('div');
          container.appendChild(range.cloneContents());
          return container.innerHTML;
        }
        return '';
      },
    });

    if (!selectionHtml) {
      alert('No text selected.');
      return;
    }

    const stored = await getStoredToken();

    if (stored && stored.token && stored.expiresAt > Date.now())
    {
      console.log("Using stored token:", stored.token);
      statusEl.textContent = `${stored.user}, ${stored.email}`;
    }
    else
    {
      console.log("No valid user found for selection, starting authentication...");
      alert('No valid user found for selection, starting authentication...!');
      await authenticate(statusEl, redirectUri);
      return;
    }

    try {
      const response = await fetch(`${originUrl}/save-selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${stored.token}`,
        },
        body: JSON.stringify({
          url: tab.url,
          selection_html: selectionHtml,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === "ok")
      {
        const resultText = data.all_text;
        document.getElementById('output').value = resultText;

        alert('Selection sent successfully!');
      }
      else
      {
        console.error('Failed to parse selection:', data);
        alert('Error: ' + (data.detail || response.status));
      }
    }
    catch (error)
    {
      console.error('Error sending selection:', error);
      alert('Request failed. See console.');
    }
  });

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", LogoutGoogle);
  }


  document.getElementById('add-selection-tags').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const prompt = document.getElementById('output').value;

    const [{ result: selectionHtml }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const selection = window.getSelection();
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        if (range) {
          const container = document.createElement('div');
          container.appendChild(range.cloneContents());
          return container.innerHTML;
        }
        return '';
      },
    });

    if (!selectionHtml) {
      alert('No text selected.');
      return;
    }

    try {
      const response = await fetch(`${originUrl}/add-selection-tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: tab.url,
          tag_prompt: prompt,
          selection_html: selectionHtml,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === "ok")
      {
        document.getElementById('output').value = data.category;
        alert('Selection sent successfully!');
      }
      else
      {
        console.error('Failed to parse selection:', data);
        alert('Error: ' + (data.detail || response.status));
      }
    }
    catch (error)
    {
      console.error('Error sending selection:', error);
      alert('Request failed. See console.');
    }
  });

  document.getElementById('open-main').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('main.html') });
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

function LogoutGoogle()
{
  chrome.storage.local.get("aiveex", (result) => {
    const data = result.aiveex;

    if (!data) {
      console.log("User logged out already, or token is absent.");
      return;
    }

    chrome.storage.local.remove("aiveex", () => {
      if (chrome.runtime.lastError) {
        console.error("Token deleting error:", chrome.runtime.lastError);
        return;
      }

      console.log("Token was deleted. User logged out.");

      const statusEl = document.getElementById("status");
      if (statusEl) {
        statusEl.textContent = "Logged out";
      }
    });
  });
}
