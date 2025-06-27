export type UIConfig = {
  host?: string;
  faviconUrl?: string;
  backgroundColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  headingFontFamily?: string;
  additionalStyles?: string;
  sectionBackgroundColor?: string;
  primaryTextColor?: string;
  linkColor?: string;
  hoverColor?: string;
  borderColor?: string;
  secondaryBackgroundColor?: string;
  secondaryTextColor?: string;
};

export default (config: UIConfig = {}): string => {
  const {
    host = '',
    faviconUrl = 'https://bsvblockchain.org/favicon.ico',
    backgroundColor = '#191919',
    primaryTextColor = '#f0f0f0',
    primaryColor = '#3b6efb',
    secondaryColor = '#001242',
    fontFamily = 'Helvetica, Arial, sans-serif',
    headingFontFamily = 'Helvetica, Arial, sans-serif',
    additionalStyles = '',
    sectionBackgroundColor = '#323940',
    linkColor = '#579DFF',
    hoverColor = '#3A4147',
    borderColor = '#B6C2CF',
    secondaryBackgroundColor = '#b7b7b7',
    secondaryTextColor = '#0e0e0e',
  } = config;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Overlay Services</title>
  <link rel="icon" type="image/x-icon" href="${faviconUrl}">
  <style>
    :root {
      --background-color: ${backgroundColor};
      --primary-color: ${primaryColor};
      --secondary-color: ${secondaryColor};
      --font-family: ${fontFamily};
      --heading-font-family: ${headingFontFamily};
      --section-background-color: ${sectionBackgroundColor};
      --link-color: ${linkColor};
      --hover-color: ${hoverColor};
      --border-color: ${borderColor};
      --secondary-background-color: ${secondaryBackgroundColor};
      --secondary-text-color: ${secondaryTextColor};
      --primary-text-color: ${primaryTextColor};
    }

    body {
      font-family: var(--font-family);
      background-color: var(--background-color);
      margin: 0;
      padding: 0;
      color: var(--primary-text-color);
    }

    h1, h2, h3 {
      font-family: var(--heading-font-family);
    }

    a {
      color: var(--link-color);
      text-decoration: none;
    }

    a:hover {
      color: var(--secondary-color);
    }

    .main {
      display: flex;
      flex-direction: row;
      height: 100vh;
      overflow: hidden;
    }

    .column_left, .column_right {
      padding: 1.5em;
      overflow-y: auto;
    }

    .column_left {
      width: 360px;
      background-color: var(--secondary-background-color);
      color: var(--secondary-text-color);
    }

    .column_right {
      width: calc(100% - 360px);
    }

    /* List styles */
    .list-item {
      margin: 0;
    }

    .list-item a {
      display: block;
      width: 100%;
      padding: 0.5em 0.75em;
      background-color: transparent;
      border-radius: 5px;
      transition: background-color 0.3s;
      text-decoration: none;
      color: inherit;
      font-weight: 500;
      cursor: pointer;
    }

    .list-item a:hover, .list-item a.active {
      background: var(--primary-color) linear-gradient(90deg, var(--primary-color), var(--secondary-color));
      color: white;
      cursor: pointer;
      border-radius: 8px 0 0 8px;
    }
    
    ul#manager_list, ul#provider_list {
      list-style-type: none;
      padding-left: 0;
      margin-top: 0.5em;
    }

    /* Detail styles */
    .detail-header {
      display: flex;
      align-items: center;
      margin-bottom: 1em;
    }

    .detail-icon {
      width: 60px;
      height: 60px;
      margin-right: 1em;
    }

    .detail-text {
      display: flex;
      flex-direction: column;
    }

    .detail-title {
      margin: 0;
    }

    .detail-description, .detail-version, .detail-info {
      margin: 0.2em 0;
    }

    .detail-info a {
      color: var(--link-color);
    }

    /* Code highlighting styles */
    pre {
      position: relative;
      padding: 1em;
      border-radius: 5px;
      overflow: auto;
      background-color: #282c34;
      margin: 1em 0;
    }
    
    pre[data-language]:before {
      content: attr(data-language);
      position: absolute;
      top: 0;
      right: 0;
      padding: 0.25em 0.5em;
      font-size: 0.75em;
      color: #abb2bf;
      background-color: #3e4451;
      border-radius: 0 0 0 4px;
      text-transform: uppercase;
    }
    
    code {
      font-family: Menlo, Monaco, 'Courier New', monospace;
      font-size: 0.9em;
    }
    
    /* Inline code */
    p code, li code {
      background-color: #3e4451;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      white-space: nowrap;
    }

    /* Responsive design */
    @media screen and (max-width: 850px) {
      .main {
        flex-direction: column;
      }

      .column_left, .column_right {
        width: 100%;
      }

      .column_right {
        border-left: none;
        border-top: 1px solid var(--border-color);
      }
    }

    ${additionalStyles}
  </style>
  <script src="https://cdn.jsdelivr.net/npm/showdown@2.0.3/dist/showdown.min.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.7.0/build/styles/atom-one-dark.min.css">
  <script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.7.0/build/highlight.min.js"></script>
  <script>
    const faviconUrl = '${faviconUrl}';

    const showdown = window.showdown;
    window.hljs.configure({ languages: ['typescript', 'javascript', 'json', 'html', 'css', 'bash', 'markdown'] });


    const Convert = (md) => {
      let converter = new showdown.Converter({
        ghCompatibleHeaderId: true,
        simpleLineBreaks: true,
        ghMentions: true,
        tables: true,
        tasklists: true,
        strikethrough: true,
        parseImgDimensions: true,
        simplifiedAutoLink: true
      });
      // Set to use GitHub flavor markdown
      converter.setFlavor('github');
      
      // Set language detection for code blocks
      converter.setOption('ghCodeBlocks', true);
      converter.setOption('omitExtraWLInCodeBlocks', true);
      converter.setOption('literalMidWordUnderscores', true);
      converter.setOption('parseImgDimensions', true);
      
      // Add custom extension for adding language-specific class to code blocks
      const codeExtension = () => [
        {
          type: 'output',
          filter: function(text) {
            return text.replace(/<pre><code\s*class="([^"]*)">(.*?)<\\/code><\\/pre>/gs, function(match, language, content) {
              if (language) {
                // Clean up the language identifier
                const lang = language.replace('language-', '').trim();
                return \`<pre data-language="\${lang}"><code class="language-\${lang} hljs">\${content}</code></pre>\`;
              } else {
                return \`<pre><code class="hljs">\${content}</code></pre>\`;
              }
            });
          }
        }
      ];
      
      // Add the extension
      converter.addExtension(codeExtension());
      const html = converter.makeHtml(md);
      
      return html;
    };
    
    // Function to apply syntax highlighting after content is inserted
    const applyHighlighting = () => {
      document.querySelectorAll('pre code').forEach(block => {
        const blockElement = block;
        
        // Check for language class
        const classList = Array.from(blockElement.classList);
        const langClass = classList.find(cls => cls.startsWith('language-'));
        
        if (langClass) {
          const language = langClass.replace('language-', '');
          // Set language label on the parent pre element
          const preElement = blockElement.parentElement;
          if (preElement) {
            preElement.setAttribute('data-language', language);
          }
        }
        
        // Apply highlighting to all code blocks
        try {
          // @ts-ignore - hljs is loaded from CDN
          window.hljs.highlightElement(blockElement);
        } catch (e) {
          console.error('Error highlighting code:', e);
        }
      });
    };

    let managersData = {};
    let providersData = {};

    // Function to update URL hash and highlight selected item
    const updateSelectedItem = (type: string, id: string) => {
      // Update URL hash
      window.location.hash = \`\${type}/\${id}\`;
      
      // Remove active class from all list items
      document.querySelectorAll('.list-item a').forEach(item => {
        item.classList.remove('active');
      });
      
      // Add active class to selected item
      const selector = \`[data-\${type}="\${id}"]\`;
      const selectedItem = document.querySelector(selector);
      if (selectedItem) {
        selectedItem.classList.add('active');
      }
    };

    // @ts-ignore - Adding custom property to window
    window.managerDocumentation = async (manager) => {
      try {
        let res = await fetch(\`${host}/getDocumentationForTopicManager?manager=\${manager}\`);
        let docs = await res.text();
        let managerReadme = Convert(docs);

        let managerData = managersData[manager];
        let iconURL = managerData.iconURL || faviconUrl;

        document.getElementById('documentation_container').innerHTML = managerReadme;
        applyHighlighting();
        
        // Update active item and URL
        updateSelectedItem('manager', manager);
      } catch (error) {
        console.error('Error fetching manager documentation:', error);
      }
    };

    // @ts-ignore - Adding custom property to window
    window.topicDocumentation = async (provider) => {
      try {
        let res = await fetch(\`${host}/getDocumentationForLookupServiceProvider?lookupService=\${provider}\`);
        let docs = await res.text();
        let providerReadme = Convert(docs);

        let providerData = providersData[provider];
        let iconURL = providerData.iconURL || faviconUrl;

        document.getElementById('documentation_container').innerHTML = providerReadme;
        applyHighlighting();
        
        // Update active item and URL
        updateSelectedItem('provider', provider);
      } catch (error) {
        console.error('Error fetching provider documentation:', error);
      }
    };

    document.addEventListener('DOMContentLoaded', () => {
      fetch('${host}/listTopicManagers')
        .then(res => res.json())
        .then(managers => {
          managersData = managers;
          const managerList = document.getElementById('manager_list');
          Object.keys(managers).forEach(manager => {
            let managerData = managers[manager];
            let li = document.createElement('li');
            li.className = 'list-item';
            li.innerHTML = \`
              <a data-manager="\${manager}" onclick="window.managerDocumentation('\${manager}')">
                \${managerData.name}
              </a>
            \`;
            managerList.appendChild(li);
          });
        })
        .catch(() => {
          let message = document.createElement('h4');
          message.innerText = 'Something went wrong!';
          manager_list.insertBefore(message, manager_list.children[0]);
        });

      fetch('${host}/listLookupServiceProviders')
        .then(res => res.json())
        .then(providers => {
          providersData = providers;
          const providerList = document.getElementById('provider_list');
          Object.keys(providers).forEach(provider => {
            let providerData = providers[provider];
            let li = document.createElement('li');
            li.className = 'list-item';
            li.innerHTML = \`
              <a data-provider="\${provider}" onclick="window.topicDocumentation('\${provider}')">
                \${providerData.name}
              </a>
            \`;
            providerList.appendChild(li);
          });
        })
        .catch(() => {
          let message = document.createElement('h4');
          message.innerText = 'Something went wrong!';
          provider_list.insertBefore(message, provider_list.children[0]);
        });

      // Check URL hash to see if we should load specific documentation
      const checkUrlHash = () => {
        const hash = window.location.hash.substring(1); // Remove the # symbol
        if (hash) {
          const parts = hash.split('/');
          if (parts.length === 2) {
            const type = parts[0];
            const id = parts[1];
            
            if (type === 'manager' && id && managersData[id]) {
              window.managerDocumentation(id);
            } else if (type === 'provider' && id && providersData[id]) {
              window.topicDocumentation(id);
            }
          }
        } else {
          // Display default message when no manager or provider is selected
          document.getElementById('documentation_container').innerHTML = '<p>Please select a manager or service from the left to see details.</p>';
        }
      };
      
      // Listen for hash changes
      window.addEventListener('hashchange', checkUrlHash);
      
      // Check hash on initial page load
      checkUrlHash();
    });
  </script>
</head>

<body>
  <div class="main">
    <div class="column_left">
      <div class="page_head">
        <h1>Overlay Services</h1>
      </div>
      <div class="topic_container">
        <h3>Topic Managers</h3>
        <ul id="manager_list"></ul>
      </div>
      <div class="provider_container">
        <h3>Lookup Services</h3>
        <ul id="provider_list"></ul>
      </div>
      <p>Learn more on <a style="color: var(--secondary-text-color)" href="https://github.com/bsv-blockchain/overlay-services" target="_blank">GitHub</a></p>
    </div>
    <div class="column_right">
      <div id="documentation_container" style="margin-left: 1.5em"></div>
    </div>
  </div>
</body>
</html>`;
};
