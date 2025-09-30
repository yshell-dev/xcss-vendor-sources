
// Utility to fetch and parse JSON
async function fetchData(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch ' + url);
    return res.json();
}

// Generate the full CDN link for a given path
function getCDNLink(path) {
    const href = window.location.href.replace('/index.html', '');
    return href + '/' + path;
}

// Create a copy button
function createCopyButton(link) {
    const btn = document.createElement('button');
    btn.textContent = 'Copy Link';
    btn.className = 'copy-btn';
    btn.onclick = () => {
        navigator.clipboard.writeText(link);
        btn.textContent = 'Copied!';
        setTimeout(() => (btn.textContent = 'Copy Link'), 1200);
    };
    return btn;
}

// Render tabs and content
function renderTabs(data) {
    const tabHeaders = document.getElementById('tab-headers');
    const tabContents = document.getElementById('tab-contents');
    tabHeaders.innerHTML = '';
    tabContents.innerHTML = '';

    const tabKeys = Object.keys(data);
    tabKeys.forEach((tab, i) => {
        // Tab header
        const li = document.createElement('li');
        li.textContent = tab;
        li.className = 'tab-header' + (i === 0 ? ' active' : '');
        li.dataset.tab = tab;
        li.onclick = () => {
            document.querySelectorAll('.tab-header').forEach(h => h.classList.remove('active'));
            li.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            document.getElementById('tab-content-' + tab).style.display = 'block';
        };
        tabHeaders.appendChild(li);

        // Tab content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'tab-content';
        contentDiv.id = 'tab-content-' + tab;
        if (i !== 0) contentDiv.style.display = 'none';

        // Each tab has 'from' and 'last' (or similar) sections
        const tabData = data[tab];
        Object.keys(tabData).forEach(section => {
            const sectionTitle = document.createElement('h2');
            sectionTitle.textContent = section;
            contentDiv.appendChild(sectionTitle);

            const ul = document.createElement('ul');
            const sectionObj = tabData[section];
            Object.keys(sectionObj).forEach(label => {
                const li = document.createElement('li');
                const link = getCDNLink(sectionObj[label]);
                const labelEl = document.createElement('span');
                labelEl.textContent = label;
                li.appendChild(labelEl);
                li.appendChild(createCopyButton(link));
                ul.appendChild(li);
            });
            contentDiv.appendChild(ul);
        });
        tabContents.appendChild(contentDiv);
    });
}

// Main
fetchData('index.json')
    .then(renderTabs)
    .catch(err => {
        document.getElementById('tab-headers').innerHTML = '<li>Error loading data</li>';
        document.getElementById('tab-contents').innerHTML = '<div>' + err.message + '</div>';
    });
