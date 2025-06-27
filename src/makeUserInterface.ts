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
  linkColor?: string;
  hoverColor?: string;
  borderColor?: string;
};

export default (config: UIConfig = {}): string => {
  const {
    host = '',
    faviconUrl = 'https://bsvblockchain.org/favicon.ico',
    backgroundColor = '#282E33',
    primaryColor = '#B6C2CF',
    secondaryColor = '#579DFF',
    fontFamily = 'Helvetica, Arial, sans-serif',
    headingFontFamily = 'Helvetica, Arial, sans-serif',
    additionalStyles = '',
    sectionBackgroundColor = '#323940',
    linkColor = '#579DFF',
    hoverColor = '#3A4147',
    borderColor = '#B6C2CF',
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
    }

    body {
      font-family: var(--font-family);
      background-color: var(--background-color);
      margin: 0;
      padding: 0;
      color: var(--primary-color);
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
      width: 35%;
      background-color: var(--section-background-color);
    }

    .column_right {
      width: 65%;
      border-left: 1px solid var(--border-color);
    }

    .docs_heading {
      text-align: center;
      padding-bottom: 0.5em;
      border-bottom: 1px solid var(--border-color);
    }

    /* List styles */
    .list-item {
      display: flex;
      align-items: center;
      margin: 0.5em 0;
    }

    .list-item a {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 0.5em;
      background-color: transparent;
      border-radius: 5px;
      transition: background-color 0.3s;
      text-decoration: none;
      color: inherit;
    }

    .list-item a:hover {
      background-color: var(--hover-color);
      cursor: pointer;
    }

    .list-icon {
      width: 40px;
      height: 40px;
      margin-right: 1em;
    }

    .list-text {
      display: flex;
      flex-direction: column;
    }

    .list-title {
      font-weight: bold;
    }

    .list-description {
      font-size: 0.9em;
      color: var(--secondary-color);
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
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.7.0/styles/github-dark.css">
  <script src="https://cdn.jsdelivr.net/npm/showdown@2.0.3/dist/showdown.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.7.0/lib/highlight.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.7.0/lib/languages/typescript.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.7.0/lib/languages/javascript.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.7.0/lib/languages/json.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.7.0/lib/languages/bash.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.7.0/lib/languages/shell.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.7.0/lib/languages/http.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.7.0/lib/languages/markdown.min.js"></script>
  <script>
    const faviconUrl = '${faviconUrl}';

    const showdown = window.showdown;

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
            return text.replace(/<pre><code\s*class="([^"]*)">(.*?)<\/code><\/pre>/gs, function(match, language, content) {
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
    const applyHighlighting = function(): void {
      document.querySelectorAll('pre code').forEach(function(block) {
        const blockElement = block as HTMLElement;
        
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
          hljs.highlightElement(blockElement);
        } catch (e) {
          console.error('Error highlighting code:', e);
        }
      });
    };

    let managersData = {};
    let providersData = {};

    // @ts-ignore - Adding custom property to window
    window.managerDocumentation = async (manager: string) => {
      try {
        let res = await fetch(\`${host}/getDocumentationForTopicManager?manager=\${manager}\`);
        let docs = await res.text();
        let managerReadme = Convert(docs);

        let managerData = managersData[manager];
        let iconURL = managerData.iconURL || faviconUrl;

        document.getElementById('documentation_container').innerHTML = managerReadme;
        applyHighlighting();
        document.getElementById('documentation_title').innerHTML = \`
          <div class="detail-header">
            <img src="\${iconURL}" alt="icon" class="detail-icon">
            <div class="detail-text">
              <h1 class="detail-title">\${managerData.name}</h1>
              <p class="detail-description">\${managerData.shortDescription || ''}</p>
              \${managerData.version ? '<p class="detail-version">Version: ' + managerData.version + '</p>' : ''}
              \${managerData.informationURL ? '<p class="detail-info"><a href="' + managerData.informationURL + '" target="_blank">More Information</a></p>' : ''}
            </div>
          </div>
        \`;
      } catch (error) {
        console.error('Error fetching manager documentation:', error);
      }
    };

    // @ts-ignore - Adding custom property to window
    window.topicDocumentation = async (provider: string) => {
      try {
        let res = await fetch(\`${host}/getDocumentationForLookupServiceProvider?lookupService=\${provider}\`);
        let docs = await res.text();
        let providerReadme = Convert(docs);

        let providerData = providersData[provider];
        let iconURL = providerData.iconURL || faviconUrl;

        document.getElementById('documentation_container').innerHTML = providerReadme;
        applyHighlighting();
        document.getElementById('documentation_title').innerHTML = \`
          <div class="detail-header">
            <img src="\${iconURL}" alt="icon" class="detail-icon">
            <div class="detail-text">
              <h1 class="detail-title">\${providerData.name}</h1>
              <p class="detail-description">\${providerData.shortDescription || ''}</p>
              \${providerData.version ? '<p class="detail-version">Version: ' + providerData.version + '</p>' : ''}
              \${providerData.informationURL ? '<p class="detail-info"><a href="' + providerData.informationURL + '" target="_blank">More Information</a></p>' : ''}
            </div>
          </div>
        \`;
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
            let iconURL = managerData.iconURL || faviconUrl;
            let li = document.createElement('li');
            li.className = 'list-item';
            li.innerHTML = \`
              <a onclick="window.managerDocumentation('\${manager}')">
                <img src="\${iconURL}" alt="icon" class="list-icon">
                <div class="list-text">
                  <span class="list-title">\${managerData.name}</span>
                  <span class="list-description">\${managerData.shortDescription || ''}</span>
                </div>
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
            let iconURL = providerData.iconURL || faviconUrl;
            let li = document.createElement('li');
            li.className = 'list-item';
            li.innerHTML = \`
              <a onclick="window.topicDocumentation('\${provider}')">
                <img src="\${iconURL}" alt="icon" class="list-icon">
                <div class="list-text">
                  <span class="list-title">\${providerData.name}</span>
                  <span class="list-description">\${providerData.shortDescription || ''}</span>
                </div>
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

      // Display default message when no manager or provider is selected
      document.getElementById('documentation_container').innerHTML = '<p>Please select a manager or service from the left to see details.</p>';
    });
  </script>
</head>

<body>
  <div class="main">
    <div class="column_left">
      <div class="page_head">
        <h1>Overlay Services</h1>
        <p>Learn more on <a href="https://github.com/bsv-blockchain/overlay-services" target="_blank">GitHub</a></p>
      </div>
      <div class="topic_container">
        <h3>Topic Managers:</h3>
        <ul id="manager_list"></ul>
      </div>
      <div class="provider_container">
        <h3>Lookup Services:</h3>
        <ul id="provider_list"></ul>
      </div>
    </div>
    <div class="column_right">
      <div id="documentation_title"></div>
      <div id="documentation_container" style="margin-left: 1.5em"></div>
    </div>
  </div>
</body>
</html>`;
};
