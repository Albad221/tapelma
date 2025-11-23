// ═══════════════════════════════════════════════════════════════════════════════
// SAMACV ADMIN DASHBOARD - JAVASCRIPT
// ═══════════════════════════════════════════════════════════════════════════════

const API_BASE = '/api/admin/document-types';

// Global state
let documentTypes = [];
let templates = [];
let fieldGroups = [];
let currentDocTypeId = null;
let botState = { step: 0, data: {}, fieldGroups: [] };

// ═══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadDashboard();
});

function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            showPage(page);
        });
    });
}

function showPage(pageName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageName);
    });

    // Update page visibility
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`page-${pageName}`).classList.add('active');

    // Update title
    const titles = {
        'dashboard': 'Dashboard',
        'document-types': 'Document Types',
        'templates': 'Templates',
        'fields': 'Form Fields',
        'simulator': 'Template Simulator',
        'bot-preview': 'Bot Preview',
        'settings': 'Settings'
    };
    document.getElementById('pageTitle').textContent = titles[pageName] || 'Dashboard';

    // Load page data
    switch (pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'document-types':
            loadDocumentTypes();
            break;
        case 'templates':
            loadTemplates();
            break;
        case 'fields':
            loadFieldsPage();
            break;
        case 'simulator':
            loadSimulatorPage();
            break;
        case 'bot-preview':
            loadBotPreviewPage();
            break;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    sidebar.classList.toggle('open');
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}?includeInactive=true`);
        documentTypes = await response.json();

        // Update stats
        document.getElementById('totalDocTypes').textContent = documentTypes.length;

        // Count templates, field groups, and fields
        let templateCount = 0;
        let fieldGroupCount = 0;
        let activeTemplateCount = 0;

        for (const dt of documentTypes) {
            const fullDt = await fetch(`${API_BASE}/${dt.id}`).then(r => r.json());
            if (fullDt) {
                templateCount += (fullDt.templates || []).length;
                activeTemplateCount += (fullDt.templates || []).filter(t => t.isActive).length;
                fieldGroupCount += (fullDt.fieldGroups || []).length;
            }
        }

        document.getElementById('totalTemplates').textContent = templateCount;
        document.getElementById('totalFields').textContent = fieldGroupCount;
        document.getElementById('activeTemplates').textContent = activeTemplateCount;

        // Render document types list
        const docTypesHtml = documentTypes.slice(0, 5).map(dt => `
            <div class="doc-type-list-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--gray-200);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="${dt.icon || 'ri-file-line'}" style="font-size: 1.5rem; color: var(--primary);"></i>
                    <div>
                        <div style="font-weight: 500;">${dt.name}</div>
                        <div style="font-size: 0.8rem; color: var(--gray-500);">${dt.slug}</div>
                    </div>
                </div>
                <span class="doc-type-status ${dt.isActive ? 'active' : 'inactive'}">
                    ${dt.isActive ? 'Active' : 'Inactive'}
                </span>
            </div>
        `).join('');
        document.getElementById('dashboardDocTypes').innerHTML = docTypesHtml || '<p style="color: var(--gray-500);">No document types yet</p>';

    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showToast('error', 'Error', 'Failed to load dashboard data');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

async function loadDocumentTypes() {
    try {
        const response = await fetch(`${API_BASE}?includeInactive=true`);
        documentTypes = await response.json();
        renderDocumentTypes();
    } catch (error) {
        console.error('Failed to load document types:', error);
        showToast('error', 'Error', 'Failed to load document types');
    }
}

function renderDocumentTypes() {
    const grid = document.getElementById('docTypesGrid');

    if (documentTypes.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="ri-file-list-3-line"></i>
                <p>No document types yet. Click "New Document Type" to create one.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = documentTypes.map(dt => `
        <div class="doc-type-card">
            <div class="doc-type-header">
                <div class="doc-type-icon">
                    <i class="${dt.icon || 'ri-file-text-line'}"></i>
                </div>
                <h4>${dt.name}</h4>
                <div class="slug">${dt.slug}</div>
            </div>
            <div class="doc-type-body">
                <div class="doc-type-info">
                    <div class="doc-type-info-item">
                        <i class="ri-file-line"></i>
                        <span>${dt.defaultOutputFormat?.toUpperCase() || 'PDF'}</span>
                    </div>
                    <div class="doc-type-info-item">
                        <i class="ri-ruler-line"></i>
                        <span>${dt.pageSize || 'A4'}</span>
                    </div>
                    <div class="doc-type-info-item">
                        <i class="ri-layout-line"></i>
                        <span>${dt.orientation || 'portrait'}</span>
                    </div>
                    <span class="doc-type-status ${dt.isActive ? 'active' : 'inactive'}">
                        <i class="ri-checkbox-circle-fill"></i>
                        ${dt.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div class="doc-type-actions">
                    <button class="btn btn-sm btn-secondary" onclick="editDocType('${dt.id}')">
                        <i class="ri-edit-line"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="manageFields('${dt.id}')">
                        <i class="ri-input-field"></i> Fields
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteDocType('${dt.id}')">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function showCreateDocTypeModal() {
    document.getElementById('docTypeModalTitle').textContent = 'Create Document Type';
    document.getElementById('docTypeForm').reset();
    document.getElementById('docTypeId').value = '';
    document.getElementById('docTypeActive').checked = true;
    document.querySelector('input[name="docTypeOrientation"][value="portrait"]').checked = true;
    document.getElementById('customSizeRow').style.display = 'none';
    openModal('docTypeModal');
}

async function editDocType(id) {
    try {
        const dt = await fetch(`${API_BASE}/${id}`).then(r => r.json());

        document.getElementById('docTypeModalTitle').textContent = 'Edit Document Type';
        document.getElementById('docTypeId').value = dt.id;
        document.getElementById('docTypeSlug').value = dt.slug;
        document.getElementById('docTypeIcon').value = dt.icon || '';
        document.getElementById('docTypeName').value = dt.name;
        document.getElementById('docTypeNameFr').value = dt.nameFr || '';
        document.getElementById('docTypeDescription').value = dt.description || '';
        document.getElementById('docTypeWelcome').value = dt.welcomeMessage || '';
        document.getElementById('docTypeFormat').value = dt.defaultOutputFormat || 'pdf';
        document.getElementById('docTypePageSize').value = dt.pageSize || 'A4';
        document.getElementById('docTypeWidth').value = dt.pageWidthMm || '';
        document.getElementById('docTypeHeight').value = dt.pageHeightMm || '';
        document.getElementById('docTypeActive').checked = dt.isActive;

        const orientation = dt.orientation || 'portrait';
        document.querySelector(`input[name="docTypeOrientation"][value="${orientation}"]`).checked = true;

        toggleCustomSize();
        openModal('docTypeModal');
    } catch (error) {
        showToast('error', 'Error', 'Failed to load document type');
    }
}

async function saveDocType() {
    const id = document.getElementById('docTypeId').value;
    const isUpdate = !!id;

    const data = {
        slug: document.getElementById('docTypeSlug').value,
        name: document.getElementById('docTypeName').value,
        nameFr: document.getElementById('docTypeNameFr').value || null,
        description: document.getElementById('docTypeDescription').value || null,
        icon: document.getElementById('docTypeIcon').value || null,
        welcomeMessage: document.getElementById('docTypeWelcome').value || null,
        defaultOutputFormat: document.getElementById('docTypeFormat').value,
        pageSize: document.getElementById('docTypePageSize').value,
        pageWidthMm: parseInt(document.getElementById('docTypeWidth').value) || null,
        pageHeightMm: parseInt(document.getElementById('docTypeHeight').value) || null,
        orientation: document.querySelector('input[name="docTypeOrientation"]:checked').value,
        isActive: document.getElementById('docTypeActive').checked
    };

    try {
        const url = isUpdate ? `${API_BASE}/${id}` : API_BASE;
        const method = isUpdate ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal('docTypeModal');
            loadDocumentTypes();
            showToast('success', 'Success', `Document type ${isUpdate ? 'updated' : 'created'} successfully`);
        } else {
            throw new Error('Failed to save');
        }
    } catch (error) {
        showToast('error', 'Error', 'Failed to save document type');
    }
}

async function deleteDocType(id) {
    if (!confirm('Are you sure you want to delete this document type? This will also delete all associated field groups, fields, and templates.')) {
        return;
    }

    try {
        await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
        loadDocumentTypes();
        showToast('success', 'Success', 'Document type deleted');
    } catch (error) {
        showToast('error', 'Error', 'Failed to delete document type');
    }
}

function toggleCustomSize() {
    const pageSize = document.getElementById('docTypePageSize').value;
    document.getElementById('customSizeRow').style.display = pageSize === 'Custom' ? 'grid' : 'none';
}

function manageFields(docTypeId) {
    document.getElementById('fieldsDocTypeFilter').value = docTypeId;
    showPage('fields');
    loadFieldGroups();
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

async function loadTemplates() {
    // Populate filter dropdown
    try {
        const response = await fetch(`${API_BASE}?includeInactive=true`);
        documentTypes = await response.json();

        const filterSelect = document.getElementById('templateDocTypeFilter');
        filterSelect.innerHTML = '<option value="">All Document Types</option>' +
            documentTypes.map(dt => `<option value="${dt.id}">${dt.name}</option>`).join('');

        // Also populate template form dropdown
        const templateDocTypeSelect = document.getElementById('templateDocType');
        templateDocTypeSelect.innerHTML = '<option value="">Select...</option>' +
            documentTypes.map(dt => `<option value="${dt.id}">${dt.name}</option>`).join('');

        await fetchAndRenderTemplates();
    } catch (error) {
        showToast('error', 'Error', 'Failed to load templates');
    }
}

async function fetchAndRenderTemplates() {
    const filterId = document.getElementById('templateDocTypeFilter').value;
    templates = [];

    try {
        if (filterId) {
            const response = await fetch(`${API_BASE}/${filterId}/templates?includeInactive=true`);
            templates = await response.json();
        } else {
            // Load templates for all document types
            for (const dt of documentTypes) {
                const response = await fetch(`${API_BASE}/${dt.id}/templates?includeInactive=true`);
                const dtTemplates = await response.json();
                templates = templates.concat(dtTemplates.map(t => ({ ...t, docTypeName: dt.name })));
            }
        }

        renderTemplates();
    } catch (error) {
        console.error('Failed to fetch templates:', error);
    }
}

function renderTemplates() {
    const grid = document.getElementById('templatesGrid');

    if (templates.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="ri-layout-4-line"></i>
                <p>No templates yet. Click "New Template" to create one.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = templates.map(t => `
        <div class="template-card">
            <div class="template-preview">
                ${t.previewImageUrl
                    ? `<img src="${t.previewImageUrl}" alt="${t.name}">`
                    : `<div class="template-preview-placeholder">
                        <i class="ri-file-text-line"></i>
                        <span>${t.name}</span>
                      </div>`
                }
                <span class="template-category-badge ${t.category || 'modern'}">${t.category || 'modern'}</span>
            </div>
            <div class="template-card-body">
                <h4>${t.name}</h4>
                <div class="doc-type">${t.docTypeName || 'Unknown Type'}</div>
                <div class="template-colors">
                    <div class="color-dot" style="background: ${t.primaryColor || '#667eea'}"></div>
                    <div class="color-dot" style="background: ${t.secondaryColor || '#764ba2'}"></div>
                    <div class="color-dot" style="background: ${t.accentColor || '#4299e1'}"></div>
                </div>
                <div class="template-card-actions">
                    <span class="doc-type-status ${t.isActive ? 'active' : 'inactive'}">
                        ${t.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn btn-icon btn-secondary" onclick="editTemplate('${t.id}')" title="Edit">
                            <i class="ri-edit-line"></i>
                        </button>
                        <button class="btn btn-icon btn-secondary" onclick="previewTemplate('${t.id}')" title="Preview">
                            <i class="ri-eye-line"></i>
                        </button>
                        <button class="btn btn-icon btn-danger" onclick="deleteTemplate('${t.id}')" title="Delete">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function showCreateTemplateModal() {
    document.getElementById('templateModalTitle').textContent = 'Create Template';
    document.getElementById('templateForm').reset();
    document.getElementById('templateId').value = '';
    document.getElementById('templateActive').checked = true;
    document.getElementById('templateHtml').value = getDefaultTemplateHtml();
    document.getElementById('templateCss').value = '';
    switchEditorTab('html');
    openModal('templateModal');
}

function getDefaultTemplateHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{personalInfo.fullName}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; color: #2c3e50; line-height: 1.6; }
        .container { padding: 40px; }
        h1 { color: {{primaryColor}}; margin-bottom: 10px; }
        .section { margin-bottom: 30px; }
        .section-title {
            font-size: 18px;
            color: {{primaryColor}};
            border-bottom: 2px solid {{primaryColor}};
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>{{personalInfo.fullName}}</h1>
        {{#if personalInfo.email}}<p>{{personalInfo.email}}</p>{{/if}}

        {{#if hasProfessionalSummary}}
        <div class="section">
            <h2 class="section-title">Summary</h2>
            <p>{{professionalSummary}}</p>
        </div>
        {{/if}}

        {{#if hasWorkExperience}}
        <div class="section">
            <h2 class="section-title">Experience</h2>
            {{#each workExperiences}}
            <div style="margin-bottom: 15px;">
                <strong>{{this.position}}</strong> at {{this.companyName}}
                <div style="font-size: 14px; color: #666;">{{this.duration}}</div>
                {{#if this.description}}<p style="margin-top: 5px;">{{this.description}}</p>{{/if}}
            </div>
            {{/each}}
        </div>
        {{/if}}

        {{#if hasEducation}}
        <div class="section">
            <h2 class="section-title">Education</h2>
            {{#each education}}
            <div style="margin-bottom: 10px;">
                <strong>{{this.degreeField}}</strong> - {{this.institution}}
            </div>
            {{/each}}
        </div>
        {{/if}}

        {{#if hasSkills}}
        <div class="section">
            <h2 class="section-title">Skills</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                {{#each skills}}
                <span style="background: {{../primaryColor}}20; color: {{../primaryColor}}; padding: 4px 12px; border-radius: 15px; font-size: 14px;">{{this.name}}</span>
                {{/each}}
            </div>
        </div>
        {{/if}}
    </div>
</body>
</html>`;
}

async function editTemplate(id) {
    try {
        const response = await fetch(`${API_BASE}/templates/${id}`);
        const t = await response.json();

        document.getElementById('templateModalTitle').textContent = 'Edit Template';
        document.getElementById('templateId').value = t.id;
        document.getElementById('templateDocType').value = t.documentTypeId;
        document.getElementById('templateSlug').value = t.slug;
        document.getElementById('templateCategory').value = t.category || 'modern';
        document.getElementById('templateName').value = t.name;
        document.getElementById('templateNameFr').value = t.nameFr || '';
        document.getElementById('templateDescription').value = t.description || '';
        document.getElementById('templatePrimaryColor').value = t.primaryColor || '#667eea';
        document.getElementById('templateSecondaryColor').value = t.secondaryColor || '#764ba2';
        document.getElementById('templateAccentColor').value = t.accentColor || '#4299e1';
        document.getElementById('templateBestFor').value = (t.bestFor || []).join(', ');
        document.getElementById('templateActive').checked = t.isActive;
        document.getElementById('templateDefault').checked = t.isDefault;
        document.getElementById('templateHtml').value = t.templateHtml || '';
        document.getElementById('templateCss').value = t.templateCss || '';

        switchEditorTab('html');
        openModal('templateModal');
    } catch (error) {
        showToast('error', 'Error', 'Failed to load template');
    }
}

async function saveTemplate() {
    const id = document.getElementById('templateId').value;
    const isUpdate = !!id;
    const docTypeId = document.getElementById('templateDocType').value;

    if (!docTypeId) {
        showToast('warning', 'Warning', 'Please select a document type');
        return;
    }

    const bestForText = document.getElementById('templateBestFor').value;
    const bestFor = bestForText ? bestForText.split(',').map(s => s.trim()).filter(Boolean) : [];

    const data = {
        slug: document.getElementById('templateSlug').value,
        name: document.getElementById('templateName').value,
        nameFr: document.getElementById('templateNameFr').value || null,
        description: document.getElementById('templateDescription').value || null,
        category: document.getElementById('templateCategory').value,
        primaryColor: document.getElementById('templatePrimaryColor').value,
        secondaryColor: document.getElementById('templateSecondaryColor').value,
        accentColor: document.getElementById('templateAccentColor').value,
        bestFor: bestFor,
        features: [],
        isActive: document.getElementById('templateActive').checked,
        isDefault: document.getElementById('templateDefault').checked,
        templateHtml: document.getElementById('templateHtml').value,
        templateCss: document.getElementById('templateCss').value || null
    };

    try {
        const url = isUpdate ? `${API_BASE}/templates/${id}` : `${API_BASE}/${docTypeId}/templates`;
        const method = isUpdate ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal('templateModal');
            loadTemplates();
            showToast('success', 'Success', `Template ${isUpdate ? 'updated' : 'created'} successfully`);
        } else {
            const error = await response.text();
            throw new Error(error);
        }
    } catch (error) {
        showToast('error', 'Error', 'Failed to save template: ' + error.message);
    }
}

async function deleteTemplate(id) {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
        await fetch(`${API_BASE}/templates/${id}`, { method: 'DELETE' });
        loadTemplates();
        showToast('success', 'Success', 'Template deleted');
    } catch (error) {
        showToast('error', 'Error', 'Failed to delete template');
    }
}

function switchEditorTab(tab) {
    document.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.editor-pane').forEach(p => p.classList.remove('active'));

    document.querySelector(`.editor-tab[onclick*="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Pane`).classList.add('active');

    if (tab === 'preview') {
        refreshTemplatePreview();
    }
}

function refreshTemplatePreview() {
    const html = document.getElementById('templateHtml').value;
    const css = document.getElementById('templateCss').value;
    const primaryColor = document.getElementById('templatePrimaryColor').value;
    const secondaryColor = document.getElementById('templateSecondaryColor').value;

    // Replace Handlebars variables with sample data for preview
    let previewHtml = html
        .replace(/\{\{personalInfo\.fullName\}\}/g, 'John Doe')
        .replace(/\{\{personalInfo\.email\}\}/g, 'john@example.com')
        .replace(/\{\{personalInfo\.phone\}\}/g, '+1 234 567 890')
        .replace(/\{\{personalInfo\.location\}\}/g, 'New York, USA')
        .replace(/\{\{professionalSummary\}\}/g, 'Experienced professional with a passion for excellence.')
        .replace(/\{\{primaryColor\}\}/g, primaryColor)
        .replace(/\{\{secondaryColor\}\}/g, secondaryColor)
        .replace(/\{\{#if [^}]+\}\}/g, '')
        .replace(/\{\{\/if\}\}/g, '')
        .replace(/\{\{#each [^}]+\}\}/g, '<div>')
        .replace(/\{\{\/each\}\}/g, '</div>')
        .replace(/\{\{this\.[^}]+\}\}/g, 'Sample Value')
        .replace(/\{\{[^}]+\}\}/g, '');

    if (css) {
        previewHtml = previewHtml.replace('</head>', `<style>${css}</style></head>`);
    }

    const iframe = document.getElementById('templatePreviewFrame');
    iframe.srcdoc = previewHtml;
}

function insertTemplateSnippet(type) {
    const snippets = {
        personalInfo: `{{personalInfo.fullName}}
{{#if personalInfo.email}}<p>Email: {{personalInfo.email}}</p>{{/if}}
{{#if personalInfo.phone}}<p>Phone: {{personalInfo.phone}}</p>{{/if}}
{{#if personalInfo.location}}<p>Location: {{personalInfo.location}}</p>{{/if}}`,
        workExperience: `{{#if hasWorkExperience}}
<div class="section">
    <h2>Work Experience</h2>
    {{#each workExperiences}}
    <div class="experience-item">
        <h3>{{this.position}}</h3>
        <p class="company">{{this.companyName}}</p>
        <p class="dates">{{this.duration}}</p>
        {{#if this.description}}<p>{{this.description}}</p>{{/if}}
    </div>
    {{/each}}
</div>
{{/if}}`,
        education: `{{#if hasEducation}}
<div class="section">
    <h2>Education</h2>
    {{#each education}}
    <div class="education-item">
        <h3>{{this.degreeField}}</h3>
        <p>{{this.institution}}</p>
        <p class="dates">{{this.duration}}</p>
    </div>
    {{/each}}
</div>
{{/if}}`,
        skills: `{{#if hasSkills}}
<div class="section">
    <h2>Skills</h2>
    <div class="skills-list">
        {{#each skills}}
        <span class="skill-tag">{{this.name}}</span>
        {{/each}}
    </div>
</div>
{{/if}}`
    };

    const textarea = document.getElementById('templateHtml');
    const snippet = snippets[type];
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    textarea.value = text.substring(0, start) + snippet + text.substring(end);
    textarea.focus();
    textarea.setSelectionRange(start + snippet.length, start + snippet.length);
}

async function previewTemplate(id) {
    showPage('simulator');
    // Set template in simulator
    const template = templates.find(t => t.id === id);
    if (template) {
        document.getElementById('simDocType').value = template.documentTypeId;
        await loadSimulatorTemplates();
        document.getElementById('simTemplate').value = id;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIELD GROUPS & FORM FIELDS
// ═══════════════════════════════════════════════════════════════════════════════

async function loadFieldsPage() {
    try {
        const response = await fetch(`${API_BASE}?includeInactive=true`);
        documentTypes = await response.json();

        const filterSelect = document.getElementById('fieldsDocTypeFilter');
        filterSelect.innerHTML = '<option value="">Select Document Type</option>' +
            documentTypes.map(dt => `<option value="${dt.id}">${dt.name}</option>`).join('');

        if (currentDocTypeId) {
            filterSelect.value = currentDocTypeId;
            loadFieldGroups();
        }
    } catch (error) {
        showToast('error', 'Error', 'Failed to load document types');
    }
}

async function loadFieldGroups() {
    const docTypeId = document.getElementById('fieldsDocTypeFilter').value;
    currentDocTypeId = docTypeId;

    const addBtn = document.getElementById('addFieldGroupBtn');
    addBtn.disabled = !docTypeId;

    const container = document.getElementById('fieldsContainer');

    if (!docTypeId) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="ri-folder-open-line"></i>
                <p>Select a document type to manage its field groups and form fields</p>
            </div>
        `;
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/${docTypeId}/groups`);
        fieldGroups = await response.json();

        // Load fields for each group
        for (let fg of fieldGroups) {
            const fieldsResponse = await fetch(`${API_BASE}/groups/${fg.id}/fields`);
            fg.fields = await fieldsResponse.json();
        }

        renderFieldGroups();
    } catch (error) {
        showToast('error', 'Error', 'Failed to load field groups');
    }
}

function renderFieldGroups() {
    const container = document.getElementById('fieldsContainer');

    if (fieldGroups.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="ri-input-field"></i>
                <p>No field groups yet. Click "New Field Group" to create one.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = fieldGroups.map(fg => `
        <div class="field-group-item">
            <div class="field-group-header" onclick="toggleFieldGroup('${fg.id}')">
                <div class="field-group-info">
                    <i class="ri-drag-move-line drag-handle"></i>
                    <div>
                        <h4>${fg.name}</h4>
                        <span class="slug">${fg.slug} - ${fg.fields?.length || 0} fields</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="field-group-badges">
                        ${fg.isMandatory ? '<span class="badge badge-warning">Required</span>' : ''}
                        ${fg.isRepeatable ? '<span class="badge badge-primary">Repeatable</span>' : ''}
                        ${fg.isAiEnhanced ? '<span class="badge badge-success">AI Enhanced</span>' : ''}
                    </div>
                    <div class="field-group-actions">
                        <button class="btn btn-icon btn-secondary" onclick="event.stopPropagation(); editFieldGroup('${fg.id}')" title="Edit">
                            <i class="ri-edit-line"></i>
                        </button>
                        <button class="btn btn-icon btn-danger" onclick="event.stopPropagation(); deleteFieldGroup('${fg.id}')" title="Delete">
                            <i class="ri-delete-bin-line"></i>
                        </button>
                        <i class="ri-arrow-down-s-line"></i>
                    </div>
                </div>
            </div>
            <div class="field-group-content" id="fg-content-${fg.id}">
                <div class="fields-list">
                    ${(fg.fields || []).map(f => `
                        <div class="field-item">
                            <div class="field-item-info">
                                <i class="ri-drag-move-line drag-handle"></i>
                                <div>
                                    <h5>${f.name} ${f.isMandatory ? '<span style="color: var(--danger);">*</span>' : ''}</h5>
                                    <span class="type">${f.fieldType} - ${f.slug}</span>
                                </div>
                            </div>
                            <div style="display: flex; gap: 6px;">
                                <button class="btn btn-icon btn-secondary" onclick="editFormField('${f.id}', '${fg.id}')" title="Edit">
                                    <i class="ri-edit-line"></i>
                                </button>
                                <button class="btn btn-icon btn-danger" onclick="deleteFormField('${f.id}')" title="Delete">
                                    <i class="ri-delete-bin-line"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                    <button class="add-field-btn" onclick="showCreateFormFieldModal('${fg.id}')">
                        <i class="ri-add-line"></i> Add Field
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function toggleFieldGroup(id) {
    const content = document.getElementById(`fg-content-${id}`);
    content.classList.toggle('expanded');
}

function showCreateFieldGroupModal() {
    if (!currentDocTypeId) {
        showToast('warning', 'Warning', 'Please select a document type first');
        return;
    }

    document.getElementById('fieldGroupModalTitle').textContent = 'Create Field Group';
    document.getElementById('fieldGroupForm').reset();
    document.getElementById('fieldGroupId').value = '';
    document.getElementById('fieldGroupDocTypeId').value = currentDocTypeId;
    document.getElementById('repeatableOptions').style.display = 'none';

    // Set default sort order
    document.getElementById('fieldGroupSortOrder').value = fieldGroups.length;

    openModal('fieldGroupModal');
}

async function editFieldGroup(id) {
    const fg = fieldGroups.find(g => g.id === id);
    if (!fg) return;

    document.getElementById('fieldGroupModalTitle').textContent = 'Edit Field Group';
    document.getElementById('fieldGroupId').value = fg.id;
    document.getElementById('fieldGroupDocTypeId').value = fg.documentTypeId;
    document.getElementById('fieldGroupSlug').value = fg.slug;
    document.getElementById('fieldGroupSortOrder').value = fg.sortOrder;
    document.getElementById('fieldGroupName').value = fg.name;
    document.getElementById('fieldGroupNameFr').value = fg.nameFr || '';
    document.getElementById('fieldGroupPrompt').value = fg.promptMessage || '';
    document.getElementById('fieldGroupRepeatable').checked = fg.isRepeatable;
    document.getElementById('fieldGroupMinEntries').value = fg.minEntries || 0;
    document.getElementById('fieldGroupMaxEntries').value = fg.maxEntries || 10;
    document.getElementById('fieldGroupMandatory').checked = fg.isMandatory;
    document.getElementById('fieldGroupAiEnhanced').checked = fg.isAiEnhanced;

    document.getElementById('repeatableOptions').style.display = fg.isRepeatable ? 'grid' : 'none';

    openModal('fieldGroupModal');
}

async function saveFieldGroup() {
    const id = document.getElementById('fieldGroupId').value;
    const docTypeId = document.getElementById('fieldGroupDocTypeId').value;
    const isUpdate = !!id;

    const data = {
        slug: document.getElementById('fieldGroupSlug').value,
        name: document.getElementById('fieldGroupName').value,
        nameFr: document.getElementById('fieldGroupNameFr').value || null,
        promptMessage: document.getElementById('fieldGroupPrompt').value || null,
        isRepeatable: document.getElementById('fieldGroupRepeatable').checked,
        minEntries: parseInt(document.getElementById('fieldGroupMinEntries').value) || 0,
        maxEntries: parseInt(document.getElementById('fieldGroupMaxEntries').value) || 10,
        isMandatory: document.getElementById('fieldGroupMandatory').checked,
        isAiEnhanced: document.getElementById('fieldGroupAiEnhanced').checked,
        sortOrder: parseInt(document.getElementById('fieldGroupSortOrder').value) || 0
    };

    try {
        const url = isUpdate ? `${API_BASE}/groups/${id}` : `${API_BASE}/${docTypeId}/groups`;
        const method = isUpdate ? 'PUT' : 'POST';

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        closeModal('fieldGroupModal');
        loadFieldGroups();
        showToast('success', 'Success', `Field group ${isUpdate ? 'updated' : 'created'}`);
    } catch (error) {
        showToast('error', 'Error', 'Failed to save field group');
    }
}

async function deleteFieldGroup(id) {
    if (!confirm('Are you sure? This will delete all fields in this group.')) return;

    try {
        await fetch(`${API_BASE}/groups/${id}`, { method: 'DELETE' });
        loadFieldGroups();
        showToast('success', 'Success', 'Field group deleted');
    } catch (error) {
        showToast('error', 'Error', 'Failed to delete field group');
    }
}

// Toggle repeatable options visibility
document.getElementById('fieldGroupRepeatable')?.addEventListener('change', function() {
    document.getElementById('repeatableOptions').style.display = this.checked ? 'grid' : 'none';
});

// Form Fields
function showCreateFormFieldModal(groupId) {
    document.getElementById('formFieldModalTitle').textContent = 'Create Form Field';
    document.getElementById('formFieldForm').reset();
    document.getElementById('formFieldId').value = '';
    document.getElementById('formFieldGroupId').value = groupId;
    document.getElementById('fieldOptionsGroup').style.display = 'none';
    document.getElementById('aiPromptGroup').style.display = 'none';

    // Set default sort order
    const fg = fieldGroups.find(g => g.id === groupId);
    document.getElementById('formFieldSortOrder').value = fg?.fields?.length || 0;

    openModal('formFieldModal');
}

async function editFormField(fieldId, groupId) {
    const fg = fieldGroups.find(g => g.id === groupId);
    const field = fg?.fields?.find(f => f.id === fieldId);
    if (!field) return;

    document.getElementById('formFieldModalTitle').textContent = 'Edit Form Field';
    document.getElementById('formFieldId').value = field.id;
    document.getElementById('formFieldGroupId').value = groupId;
    document.getElementById('formFieldSlug').value = field.slug;
    document.getElementById('formFieldType').value = field.fieldType;
    document.getElementById('formFieldName').value = field.name;
    document.getElementById('formFieldNameFr').value = field.nameFr || '';
    document.getElementById('formFieldPlaceholder').value = field.placeholder || '';
    document.getElementById('formFieldSortOrder').value = field.sortOrder;
    document.getElementById('formFieldOptions').value = field.options ? JSON.stringify(field.options, null, 2) : '';
    document.getElementById('formFieldValidation').value = field.validationRegex || '';
    document.getElementById('formFieldDefault').value = field.defaultValue || '';
    document.getElementById('formFieldMandatory').checked = field.isMandatory;
    document.getElementById('formFieldAiEnhanced').checked = field.isAiEnhanced;
    document.getElementById('formFieldAiPrompt').value = field.aiPrompt || '';

    toggleFieldOptions();
    openModal('formFieldModal');
}

async function saveFormField() {
    const id = document.getElementById('formFieldId').value;
    const groupId = document.getElementById('formFieldGroupId').value;
    const isUpdate = !!id;

    let options = null;
    const optionsText = document.getElementById('formFieldOptions').value;
    if (optionsText) {
        try {
            options = JSON.parse(optionsText);
        } catch (e) {
            showToast('error', 'Error', 'Invalid JSON for options');
            return;
        }
    }

    const data = {
        slug: document.getElementById('formFieldSlug').value,
        fieldType: document.getElementById('formFieldType').value,
        name: document.getElementById('formFieldName').value,
        nameFr: document.getElementById('formFieldNameFr').value || null,
        placeholder: document.getElementById('formFieldPlaceholder').value || null,
        sortOrder: parseInt(document.getElementById('formFieldSortOrder').value) || 0,
        options: options,
        validationRegex: document.getElementById('formFieldValidation').value || null,
        defaultValue: document.getElementById('formFieldDefault').value || null,
        isMandatory: document.getElementById('formFieldMandatory').checked,
        isAiEnhanced: document.getElementById('formFieldAiEnhanced').checked,
        aiPrompt: document.getElementById('formFieldAiPrompt').value || null
    };

    try {
        const url = isUpdate ? `${API_BASE}/fields/${id}` : `${API_BASE}/groups/${groupId}/fields`;
        const method = isUpdate ? 'PUT' : 'POST';

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        closeModal('formFieldModal');
        loadFieldGroups();
        showToast('success', 'Success', `Form field ${isUpdate ? 'updated' : 'created'}`);
    } catch (error) {
        showToast('error', 'Error', 'Failed to save form field');
    }
}

async function deleteFormField(id) {
    if (!confirm('Are you sure you want to delete this field?')) return;

    try {
        await fetch(`${API_BASE}/fields/${id}`, { method: 'DELETE' });
        loadFieldGroups();
        showToast('success', 'Success', 'Field deleted');
    } catch (error) {
        showToast('error', 'Error', 'Failed to delete field');
    }
}

function toggleFieldOptions() {
    const fieldType = document.getElementById('formFieldType').value;
    const showOptions = ['select', 'multiselect'].includes(fieldType);
    document.getElementById('fieldOptionsGroup').style.display = showOptions ? 'block' : 'none';

    const aiEnhanced = document.getElementById('formFieldAiEnhanced').checked;
    document.getElementById('aiPromptGroup').style.display = aiEnhanced ? 'block' : 'none';
}

document.getElementById('formFieldAiEnhanced')?.addEventListener('change', toggleFieldOptions);

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATOR
// ═══════════════════════════════════════════════════════════════════════════════

async function loadSimulatorPage() {
    try {
        const response = await fetch(`${API_BASE}?includeInactive=true`);
        documentTypes = await response.json();

        const simDocTypeSelect = document.getElementById('simDocType');
        simDocTypeSelect.innerHTML = '<option value="">Select...</option>' +
            documentTypes.map(dt => `<option value="${dt.id}">${dt.name}</option>`).join('');
    } catch (error) {
        showToast('error', 'Error', 'Failed to load document types');
    }
}

async function loadSimulatorTemplates() {
    const docTypeId = document.getElementById('simDocType').value;
    const simTemplateSelect = document.getElementById('simTemplate');

    if (!docTypeId) {
        simTemplateSelect.innerHTML = '<option value="">Select...</option>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/${docTypeId}/templates`);
        const templates = await response.json();

        simTemplateSelect.innerHTML = '<option value="">Select...</option>' +
            templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    } catch (error) {
        showToast('error', 'Error', 'Failed to load templates');
    }
}

document.getElementById('simSampleData')?.addEventListener('change', function() {
    document.getElementById('customDataGroup').style.display = this.value === 'custom' ? 'block' : 'none';
});

async function runSimulation() {
    const templateId = document.getElementById('simTemplate').value;
    if (!templateId) {
        showToast('warning', 'Warning', 'Please select a template');
        return;
    }

    const sampleDataType = document.getElementById('simSampleData').value;
    let sampleData;

    if (sampleDataType === 'custom') {
        try {
            sampleData = JSON.parse(document.getElementById('customJsonData').value);
        } catch (e) {
            showToast('error', 'Error', 'Invalid JSON data');
            return;
        }
    } else {
        sampleData = getSampleData(sampleDataType);
    }

    try {
        // For now, show a preview using the template HTML directly
        const response = await fetch(`${API_BASE}/templates/${templateId}`);
        const template = await response.json();

        // Simple Handlebars-like replacement for preview
        let html = template.templateHtml;

        // Replace simple variables
        html = html.replace(/\{\{personalInfo\.fullName\}\}/g, sampleData.personalInfo?.fullName || 'John Doe');
        html = html.replace(/\{\{personalInfo\.email\}\}/g, sampleData.personalInfo?.email || 'john@example.com');
        html = html.replace(/\{\{personalInfo\.phone\}\}/g, sampleData.personalInfo?.phone || '+1 234 567 890');
        html = html.replace(/\{\{personalInfo\.location\}\}/g, sampleData.personalInfo?.location || 'New York, USA');
        html = html.replace(/\{\{professionalSummary\}\}/g, sampleData.professionalSummary || '');
        html = html.replace(/\{\{primaryColor\}\}/g, template.primaryColor || '#667eea');
        html = html.replace(/\{\{secondaryColor\}\}/g, template.secondaryColor || '#764ba2');

        // Handle conditionals simply
        html = html.replace(/\{\{#if hasWorkExperience\}\}([\s\S]*?)\{\{\/if\}\}/g,
            sampleData.workExperiences?.length ? '$1' : '');
        html = html.replace(/\{\{#if hasEducation\}\}([\s\S]*?)\{\{\/if\}\}/g,
            sampleData.education?.length ? '$1' : '');
        html = html.replace(/\{\{#if hasSkills\}\}([\s\S]*?)\{\{\/if\}\}/g,
            sampleData.skills?.length ? '$1' : '');
        html = html.replace(/\{\{#if hasProfessionalSummary\}\}([\s\S]*?)\{\{\/if\}\}/g,
            sampleData.professionalSummary ? '$1' : '');

        // Clean up remaining conditionals
        html = html.replace(/\{\{#if [^}]+\}\}/g, '');
        html = html.replace(/\{\{\/if\}\}/g, '');
        html = html.replace(/\{\{#each [^}]+\}\}/g, '');
        html = html.replace(/\{\{\/each\}\}/g, '');
        html = html.replace(/\{\{this\.[^}]+\}\}/g, 'Sample');
        html = html.replace(/\{\{[^}]+\}\}/g, '');

        const previewContent = document.getElementById('previewContent');
        previewContent.innerHTML = `<iframe style="width: 100%; height: 100%; border: none; background: white;" srcdoc="${html.replace(/"/g, '&quot;')}"></iframe>`;

        showToast('success', 'Success', 'Preview generated');
    } catch (error) {
        showToast('error', 'Error', 'Failed to generate preview');
    }
}

function getSampleData(type) {
    const fullData = {
        personalInfo: {
            fullName: 'John Doe',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '+1 (555) 123-4567',
            location: 'New York, NY',
            linkedIn: 'linkedin.com/in/johndoe',
            portfolio: 'johndoe.dev'
        },
        professionalSummary: 'Experienced software engineer with 10+ years of expertise in building scalable web applications. Passionate about clean code, user experience, and mentoring junior developers.',
        workExperiences: [
            {
                position: 'Senior Software Engineer',
                companyName: 'Tech Corp',
                duration: '2020 - Present',
                location: 'New York, NY',
                description: 'Led a team of 5 engineers in developing microservices architecture. Improved system performance by 40%.'
            },
            {
                position: 'Software Engineer',
                companyName: 'StartupXYZ',
                duration: '2017 - 2020',
                location: 'San Francisco, CA',
                description: 'Developed core features for the main product, resulting in 50% increase in user engagement.'
            }
        ],
        education: [
            {
                institution: 'MIT',
                degreeField: 'B.S. Computer Science',
                duration: '2013 - 2017'
            }
        ],
        skills: [
            { name: 'JavaScript' },
            { name: 'TypeScript' },
            { name: 'React' },
            { name: 'Node.js' },
            { name: 'Python' },
            { name: 'AWS' }
        ],
        languages: [
            { name: 'English', proficiency: 'Native' },
            { name: 'Spanish', proficiency: 'Professional' }
        ],
        certifications: [
            { name: 'AWS Solutions Architect', issuingOrganization: 'Amazon Web Services' }
        ]
    };

    if (type === 'minimal') {
        return {
            personalInfo: { fullName: 'Jane Smith', email: 'jane@example.com' }
        };
    }

    return fullData;
}

function downloadPreview() {
    showToast('info', 'Info', 'PDF download functionality coming soon');
}

function toggleFullscreen() {
    const preview = document.querySelector('.simulator-preview');
    preview.classList.toggle('fullscreen');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOT PREVIEW
// ═══════════════════════════════════════════════════════════════════════════════

async function loadBotPreviewPage() {
    try {
        const response = await fetch(`${API_BASE}?includeInactive=false`);
        documentTypes = await response.json();

        const botDocTypeSelect = document.getElementById('botDocType');
        botDocTypeSelect.innerHTML = '<option value="">Select to start...</option>' +
            documentTypes.map(dt => `<option value="${dt.id}">${dt.name}</option>`).join('');
    } catch (error) {
        showToast('error', 'Error', 'Failed to load document types');
    }
}

async function startBotSimulation() {
    const docTypeId = document.getElementById('botDocType').value;
    if (!docTypeId) return;

    try {
        const response = await fetch(`${API_BASE}/${docTypeId}`);
        const docType = await response.json();

        botState = {
            step: 0,
            data: {},
            fieldGroups: docType.fieldGroups || [],
            docType: docType
        };

        const chatContent = document.getElementById('botChatContent');
        chatContent.innerHTML = '';

        addBotMessage(docType.welcomeMessage || `Great! Let's create your ${docType.name}. I'll guide you through each section.`);

        // Start with first field group
        if (botState.fieldGroups.length > 0) {
            const firstGroup = botState.fieldGroups[0];
            setTimeout(() => {
                addBotMessage(firstGroup.promptMessage || `Please provide your ${firstGroup.name.toLowerCase()}.`);
            }, 1000);
        }

        updateCollectedData();
    } catch (error) {
        showToast('error', 'Error', 'Failed to start simulation');
    }
}

function resetBotSimulation() {
    botState = { step: 0, data: {}, fieldGroups: [] };
    document.getElementById('botChatContent').innerHTML = `
        <div class="chat-message bot">
            <p>Welcome! What type of document would you like to create?</p>
        </div>
    `;
    document.getElementById('botDocType').value = '';
    updateCollectedData();
}

function addBotMessage(text) {
    const chatContent = document.getElementById('botChatContent');
    const msg = document.createElement('div');
    msg.className = 'chat-message bot';
    msg.innerHTML = `<p>${text}</p>`;
    chatContent.appendChild(msg);
    chatContent.scrollTop = chatContent.scrollHeight;
}

function addUserMessage(text) {
    const chatContent = document.getElementById('botChatContent');
    const msg = document.createElement('div');
    msg.className = 'chat-message user';
    msg.innerHTML = `<p>${text}</p>`;
    chatContent.appendChild(msg);
    chatContent.scrollTop = chatContent.scrollHeight;
}

function handleBotInput(event) {
    if (event.key === 'Enter') {
        sendBotMessage();
    }
}

function sendBotMessage() {
    const input = document.getElementById('botInput');
    const text = input.value.trim();
    if (!text) return;

    addUserMessage(text);
    input.value = '';

    // Process the message
    processBotResponse(text);
}

function processBotResponse(userInput) {
    if (botState.fieldGroups.length === 0) {
        addBotMessage('Please select a document type first.');
        return;
    }

    const currentGroup = botState.fieldGroups[botState.step];
    if (!currentGroup) {
        addBotMessage(botState.docType?.completionMessage || 'All done! Your document is ready.');
        return;
    }

    // Store the data
    botState.data[currentGroup.slug] = userInput;
    updateCollectedData();

    // Move to next step
    botState.step++;

    if (botState.step < botState.fieldGroups.length) {
        const nextGroup = botState.fieldGroups[botState.step];
        setTimeout(() => {
            addBotMessage(nextGroup.promptMessage || `Now, please provide your ${nextGroup.name.toLowerCase()}.`);
        }, 500);
    } else {
        setTimeout(() => {
            addBotMessage(botState.docType?.completionMessage || 'Perfect! I have all the information I need. Generating your document...');
        }, 500);
    }
}

function updateCollectedData() {
    document.getElementById('collectedData').textContent = JSON.stringify(botState.data, null, 2);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS & UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

async function migrateExistingTemplates() {
    if (!confirm('This will migrate existing CV templates from the filesystem to the database. Continue?')) {
        return;
    }

    try {
        showToast('info', 'Info', 'Migration started... This may take a moment.');

        const response = await fetch(`${API_BASE}/migrate-cv-templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (result.success) {
            showToast('success', 'Success', `Migration complete. ${result.migratedTemplates?.length || 0} templates migrated.`);
            // Reload data
            loadDocumentTypes();
            loadTemplates();
        } else {
            throw new Error(result.error || 'Migration failed');
        }
    } catch (error) {
        showToast('error', 'Error', 'Migration failed: ' + error.message);
    }
}

async function seedSampleDocTypes() {
    if (!confirm('This will create sample document types (Business Card, Flyer). Continue?')) {
        return;
    }

    const samples = [
        {
            slug: 'business-card',
            name: 'Business Card',
            nameFr: 'Carte de Visite',
            description: 'Professional business cards',
            icon: 'ri-profile-line',
            defaultOutputFormat: 'pdf',
            pageSize: 'Custom',
            pageWidthMm: 85,
            pageHeightMm: 55,
            orientation: 'landscape',
            welcomeMessage: "Let's create your business card. I'll need your name, title, and contact information."
        },
        {
            slug: 'flyer',
            name: 'Flyer',
            nameFr: 'Flyer / Prospectus',
            description: 'Promotional flyers and posters',
            icon: 'ri-file-paper-2-line',
            defaultOutputFormat: 'pdf',
            pageSize: 'A4',
            orientation: 'portrait',
            welcomeMessage: "Great! Let's design your flyer. What's the main headline or event name?"
        }
    ];

    try {
        for (const sample of samples) {
            await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sample)
            });
        }

        showToast('success', 'Success', 'Sample document types created');
        loadDocumentTypes();
    } catch (error) {
        showToast('error', 'Error', 'Failed to create samples: ' + error.message);
    }
}

async function exportConfiguration() {
    try {
        const allData = [];

        for (const dt of documentTypes) {
            const fullDt = await fetch(`${API_BASE}/${dt.id}`).then(r => r.json());
            allData.push(fullDt);
        }

        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `samacv-config-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('success', 'Success', 'Configuration exported');
    } catch (error) {
        showToast('error', 'Error', 'Failed to export configuration');
    }
}

function importConfiguration(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            showToast('info', 'Info', 'Import functionality coming soon');
            // TODO: Implement import logic
        } catch (error) {
            showToast('error', 'Error', 'Invalid JSON file');
        }
    };
    reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function openModal(modalId) {
    document.getElementById('modalOverlay').classList.add('active');
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById(modalId).classList.remove('active');
}

// Close modal on overlay click
document.getElementById('modalOverlay')?.addEventListener('click', () => {
    document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
    });
    document.getElementById('modalOverlay').classList.remove('active');
});

// ═══════════════════════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

function showToast(type, title, message) {
    const container = document.getElementById('toastContainer');
    const icons = {
        success: 'ri-checkbox-circle-fill',
        error: 'ri-error-warning-fill',
        warning: 'ri-alert-fill',
        info: 'ri-information-fill'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="${icons[type]}"></i>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="ri-close-line"></i>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}
