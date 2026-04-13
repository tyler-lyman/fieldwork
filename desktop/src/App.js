import React, { useState, useEffect, useRef } from 'react';
import {
  Grid, Search, Plus, X, Upload, ChevronRight,
  Folder, FileText, ArrowLeft, Download, AlertCircle,
  CheckCircle, Eye, Trash2
} from 'lucide-react';
import './index.css';

// ── Utility ───────────────────────────────────────────────────────────────────

const PROJECT_COLORS = ['blue', 'green', 'amber', 'purple', 'coral', 'teal'];

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const colorMap = {
  blue:   { bg: '#1e3a5f', icon: '#60a5fa', border: '#1d4ed8' },
  green:  { bg: '#14391f', icon: '#4ade80', border: '#15803d' },
  amber:  { bg: '#3d2a00', icon: '#fbbf24', border: '#d97706' },
  purple: { bg: '#2d1b69', icon: '#a78bfa', border: '#7c3aed' },
  coral:  { bg: '#4a1c1c', icon: '#fb7185', border: '#e11d48' },
  teal:   { bg: '#0d3330', icon: '#2dd4bf', border: '#0d9488' },
};

const TYPE_LABELS = { element: 'Element', pattern: 'Pattern', system: 'System' };
const TYPE_COLORS = { element: 'badge-element', pattern: 'badge-pattern', system: 'badge-system' };
const STATUS_COLORS = { draft: 'badge-draft', approved: 'badge-approved' };
const getDriftCount = (contentType) =>
  (contentType.examples || []).filter(e => e.conforms === false).length;

// ── Sample Data ───────────────────────────────────────────────────────────────

const SAMPLE_PROJECTS = [
  {
    id: 'p1', name: 'Settings', color: 'blue',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'p2', name: 'Permissions', color: 'green',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'p3', name: 'Onboarding', color: 'amber',
    lastUpdated: new Date().toISOString(),
  },
];

const SAMPLE_CONTENT_TYPES = [
  {
    id: 'ct1', projectId: 'p1',
    name: 'Inline validation error',
    whatItDoes: 'Instruct the user how to correct a specific field input, immediately adjacent to the field where the error occurred.',
    type: 'element', status: 'approved', scope: 'product',
    rules: [
      { field: 'Error text', required: true, charRange: '10-60', ifMissing: 'User can\'t self-correct' },
      { field: 'Correction instruction', required: true, charRange: '', ifMissing: 'User knows error exists but not how to fix it' },
    ],
    surfaceDifferences: [
      { surface: 'Cluster', rule: 'Max 40 chars. No punctuation. No secondary action.' },
      { surface: 'App and web', rule: 'Max 60 chars. Standard rules.' },
    ],
    examples: [
      { id: 'e1', surface: 'App', copy: 'Enter a valid email address.', conforms: true, driftNote: '', screenshot: null },
      { id: 'e2', surface: 'Web', copy: "Oops! That doesn't look right.", conforms: false, driftNote: 'Flagging the error but not telling the user how to fix it. Missing correction instruction.', screenshot: null },
      { id: 'e3', surface: 'Cluster', copy: 'Invalid entry', conforms: true, driftNote: '', screenshot: null },
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'ct2', projectId: 'p1',
    name: 'Field label',
    whatItDoes: 'Name the input the user is being asked to complete.',
    type: 'element', status: 'approved', scope: 'product',
    rules: [
      { field: 'Label text', required: true, charRange: '2-30', ifMissing: 'User doesn\'t know what to enter' },
    ],
    surfaceDifferences: [],
    examples: [
      { id: 'e4', surface: 'App', copy: 'Email address', conforms: true, driftNote: '', screenshot: null },
      { id: 'e5', surface: 'Web', copy: 'Email', conforms: true, driftNote: '', screenshot: null },
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'ct3', projectId: 'p1',
    name: 'Section heading',
    whatItDoes: 'Inform the user which part of settings they are in.',
    type: 'element', status: 'draft', scope: 'org',
    rules: [
      { field: 'Heading text', required: true, charRange: '3-40', ifMissing: 'User loses place in settings' },
    ],
    surfaceDifferences: [],
    examples: [
      { id: 'e6', surface: 'App', copy: 'Account settings', conforms: true, driftNote: '', screenshot: null },
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'ct4', projectId: 'p2',
    name: 'Permission prompt',
    whatItDoes: 'Ask the user to grant or deny access to a specific device capability.',
    type: 'pattern', status: 'approved', scope: 'product',
    rules: [
      { field: 'Capability name', required: true, charRange: '2-20', ifMissing: 'User doesn\'t know what they\'re granting' },
      { field: 'Plain-language explanation', required: true, charRange: '20-100', ifMissing: 'User can\'t make an informed decision' },
      { field: 'Consequence statement', required: true, charRange: '10-80', ifMissing: 'User doesn\'t understand impact' },
    ],
    surfaceDifferences: [],
    examples: [
      { id: 'e7', surface: 'App', copy: 'Allow Fieldwork to access your camera to add screenshots to your content models.', conforms: true, driftNote: '', screenshot: null },
    ],
    lastUpdated: new Date().toISOString(),
  },
];

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [view, setView] = useState('welcome');
  const [libraryPath, setLibraryPath] = useState(localStorage.getItem('fieldworkPath') || '');
  const [projects, setProjects] = useState([]);
  const [contentTypes, setContentTypes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedContentType, setSelectedContentType] = useState(null);

  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewContentType, setShowNewContentType] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const [auditTypeId, setAuditTypeId] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (libraryPath) {
      setView('dashboard');
      loadLibrary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryPath]);

  const loadLibrary = async () => {
    if (window.electronAPI && libraryPath) {
      setLoading(true);
      try {
        const data = await window.electronAPI.scanLibrary(libraryPath);
        setProjects(data.projects || []);
        setContentTypes(data.contentTypes || []);
      } catch (err) {
        console.error(err);
        loadSampleData();
      }
      setLoading(false);
    } else {
      loadSampleData();
    }
  };

  const loadSampleData = () => {
    setProjects(SAMPLE_PROJECTS);
    setContentTypes(SAMPLE_CONTENT_TYPES);
  };

  const createFolder = async () => {
    if (window.electronAPI) {
      const folder = await window.electronAPI.createFolder();
      if (folder) {
        setLibraryPath(folder);
        localStorage.setItem('fieldworkPath', folder);
      }
    } else {
      const name = prompt('Library folder name:');
      if (name) {
        const folder = `/Documents/${name}`;
        setLibraryPath(folder);
        localStorage.setItem('fieldworkPath', folder);
        loadSampleData();
      }
    }
  };

  const selectFolder = async () => {
    if (window.electronAPI) {
      const folder = await window.electronAPI.selectFolder();
      if (folder) {
        setLibraryPath(folder);
        localStorage.setItem('fieldworkPath', folder);
      }
    } else {
      loadSampleData();
      setLibraryPath('/demo/fieldwork');
      localStorage.setItem('fieldworkPath', '/demo/fieldwork');
    }
  };

  const switchLibrary = () => {
    setLibraryPath('');
    localStorage.removeItem('fieldworkPath');
    setProjects([]);
    setContentTypes([]);
    setSelectedProject(null);
    setSelectedContentType(null);
    setView('welcome');
  };

  // ── Projects ──

  const createProject = async (name, color) => {
    const project = {
      id: generateId(),
      name, color,
      lastUpdated: new Date().toISOString(),
    };
    const updated = [...projects, project];
    setProjects(updated);
    if (window.electronAPI && libraryPath) {
      await window.electronAPI.createProjectFolder(project, libraryPath);
    }
    setShowNewProject(false);
  };

  const deleteProject = async (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (!window.confirm(`Delete project "${project?.name}"? This cannot be undone.`)) return;
    setProjects(projects.filter(p => p.id !== projectId));
    setContentTypes(contentTypes.filter(ct => ct.projectId !== projectId));
    if (window.electronAPI && libraryPath && project) {
      await window.electronAPI.deleteProjectFolder(project.name, libraryPath);
    }
    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
      setView('dashboard');
    }
  };

  // ── Content Types ──

  const saveContentType = async (ct) => {
    const isNew = !contentTypes.find(c => c.id === ct.id);
    const updated = isNew
      ? [...contentTypes, { ...ct, lastUpdated: new Date().toISOString() }]
      : contentTypes.map(c => c.id === ct.id ? { ...ct, lastUpdated: new Date().toISOString() } : c);
    setContentTypes(updated);
    if (selectedContentType?.id === ct.id) setSelectedContentType(ct);
    if (window.electronAPI && libraryPath) {
      const project = projects.find(p => p.id === ct.projectId);
      await window.electronAPI.saveContentType(ct, libraryPath, project?.name);
    }
    setShowNewContentType(false);
  };

  const deleteContentType = async (ctId) => {
    const ct = contentTypes.find(c => c.id === ctId);
    if (!window.confirm(`Delete "${ct?.name}"? This cannot be undone.`)) return;
    setContentTypes(contentTypes.filter(c => c.id !== ctId));
    if (window.electronAPI && libraryPath && ct) {
      const project = projects.find(p => p.id === ct.projectId);
      await window.electronAPI.deleteContentType(ct, libraryPath, project?.name);
    }
    if (selectedContentType?.id === ctId) {
      setSelectedContentType(null);
      setView('project');
    }
  };

  // ── Computed ──

  const projectContentTypes = (projectId) =>
    contentTypes.filter(ct => ct.projectId === projectId);

  const filteredProjectTypes = selectedProject
    ? projectContentTypes(selectedProject.id).filter(ct => {
        const matchesType = typeFilter === 'all' || ct.type === typeFilter;
        const matchesDrift = typeFilter === 'drift' ? getDriftCount(ct) > 0 : true;
        const matchesSearch = !searchQuery ||
          ct.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ct.whatItDoes.toLowerCase().includes(searchQuery.toLowerCase());
        return (typeFilter === 'drift' ? matchesDrift : matchesType) && matchesSearch;
      })
    : [];

  const allContentTypeNames = [...new Set(contentTypes.map(ct => ct.name))];

  // ── Export ──

  const exportAIBriefing = () => {
    if (!selectedProject) return;
    const cts = projectContentTypes(selectedProject.id);
    let md = `# ${selectedProject.name}: Content Architecture Briefing\n\n`;
    md += `> This document defines the content types for the ${selectedProject.name} project. Each type has a single job, defined rules, and real examples with conformance judgments. Use this as a constraint specification when generating content.\n\n`;
    cts.forEach(ct => {
      md += `---\n\n## ${ct.name}\n\n`;
      md += `**What it does:** ${ct.whatItDoes}\n\n`;
      md += `**Type:** ${ct.type} | **Status:** ${ct.status} | **Scope:** ${ct.scope === 'org' ? 'Org-wide candidate' : 'This project only'}\n\n`;
      if (ct.rules?.length) {
        md += `### Rules\n\n`;
        ct.rules.forEach(r => {
          md += `- **${r.field}** (${r.required ? 'Required' : 'Optional'})`;
          if (r.charRange) md += `, ${r.charRange} chars`;
          if (r.ifMissing) md += `. If missing: ${r.ifMissing}`;
          md += '\n';
        });
        md += '\n';
      }
      if (ct.surfaceDifferences?.length) {
        md += `### Surface differences\n\n`;
        ct.surfaceDifferences.forEach(s => {
          md += `- **${s.surface}:** ${s.rule}\n`;
        });
        md += '\n';
      }
      if (ct.examples?.length) {
        md += `### Examples\n\n`;
        ct.examples.forEach(e => {
          md += `- **${e.surface}:** "${e.copy}" (${e.conforms ? '✓ Conforms' : '✗ Does not conform'})`;
          if (!e.conforms && e.driftNote) md += ` - ${e.driftNote}`;
          md += '\n';
        });
        md += '\n';
      }
    });
    downloadFile(`${selectedProject.name.toLowerCase().replace(/\s+/g, '-')}-ai-briefing.md`, md, 'text/markdown');
  };

  const exportTeamDoc = () => {
    if (!selectedProject) return;
    const cts = projectContentTypes(selectedProject.id);
    const totalExamples = cts.reduce((n, ct) => n + (ct.examples?.length || 0), 0);
    const totalDrift = cts.reduce((n, ct) => n + getDriftCount(ct), 0);

    let html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>${selectedProject.name}: Content Architecture</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 48px 32px; background: #0f172a; color: #f1f5f9; line-height: 1.6; }
  h1 { font-size: 2rem; font-weight: 700; margin-bottom: 8px; }
  .meta { color: #94a3b8; font-size: 0.875rem; margin-bottom: 48px; }
  .stats { display: flex; gap: 24px; margin-bottom: 48px; }
  .stat { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 16px 20px; }
  .stat-num { font-size: 1.75rem; font-weight: 700; }
  .stat-label { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }
  .ct { margin-bottom: 48px; border: 1px solid #334155; border-radius: 12px; overflow: hidden; }
  .ct-header { background: #1e293b; padding: 20px 24px; border-bottom: 1px solid #334155; }
  .ct-name { font-size: 1.25rem; font-weight: 600; margin-bottom: 6px; }
  .ct-job { color: #94a3b8; font-style: italic; font-size: 0.9rem; }
  .badges { display: flex; gap: 8px; margin-top: 10px; }
  .badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 20px; }
  .badge-element { background: #1e3a5f; color: #60a5fa; }
  .badge-pattern { background: #14391f; color: #4ade80; }
  .badge-approved { background: #14391f; color: #4ade80; }
  .badge-draft { background: #1e293b; color: #64748b; border: 1px solid #334155; }
  .ct-body { padding: 20px 24px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 0.7rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th { background: #1e293b; padding: 8px 12px; text-align: left; color: #94a3b8; font-weight: 500; border-bottom: 1px solid #334155; }
  td { padding: 8px 12px; border-bottom: 1px solid #1e293b; vertical-align: top; }
  .example { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; }
  .example.drift { border-color: #991b1b; }
  .example-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 0.75rem; }
  .surface { font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: #94a3b8; }
  .conforms { color: #4ade80; }
  .no-conform { color: #f87171; }
  .example-copy { font-style: italic; font-size: 0.9rem; }
  .drift-note { font-size: 0.8rem; color: #f87171; margin-top: 6px; }
</style></head><body>
<h1>${selectedProject.name}</h1>
<div class="meta">Content architecture reference · Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
<div class="stats">
  <div class="stat"><div class="stat-num">${cts.length}</div><div class="stat-label">Content types</div></div>
  <div class="stat"><div class="stat-num">${totalExamples}</div><div class="stat-label">Examples</div></div>
  <div class="stat"><div class="stat-num" style="color:${totalDrift > 0 ? '#f87171' : '#4ade80'}">${totalDrift}</div><div class="stat-label">Don't conform</div></div>
</div>`;

    cts.forEach(ct => {
      html += `<div class="ct">
  <div class="ct-header">
    <div class="ct-name">${ct.name}</div>
    <div class="ct-job">${ct.whatItDoes}</div>
    <div class="badges">
      <span class="badge badge-${ct.type}">${ct.type}</span>
      <span class="badge badge-${ct.status}">${ct.status}</span>
    </div>
  </div>
  <div class="ct-body">`;

      if (ct.rules?.length) {
        html += `<div class="section"><div class="section-title">Rules</div>
    <table><thead><tr><th>Field</th><th>Required</th><th>Char range</th><th>If missing</th></tr></thead><tbody>`;
        ct.rules.forEach(r => {
          html += `<tr><td><strong>${r.field}</strong></td><td>${r.required ? 'Yes' : 'No'}</td><td>${r.charRange}</td><td style="color:#94a3b8">${r.ifMissing}</td></tr>`;
        });
        html += `</tbody></table></div>`;
      }

      if (ct.surfaceDifferences?.length) {
        html += `<div class="section"><div class="section-title">Surface differences</div>`;
        ct.surfaceDifferences.forEach(s => {
          html += `<p style="font-size:0.875rem;margin-bottom:4px"><strong>${s.surface}:</strong> ${s.rule}</p>`;
        });
        html += `</div>`;
      }

      if (ct.examples?.length) {
        html += `<div class="section"><div class="section-title">Examples</div>`;
        ct.examples.forEach(e => {
          html += `<div class="example ${e.conforms ? '' : 'drift'}">
      <div class="example-header">
        <span class="surface">${e.surface}</span>
        <span class="${e.conforms ? 'conforms' : 'no-conform'}">${e.conforms ? '✓ Conforms' : '✗ Doesn\'t conform'}</span>
      </div>
      <div class="example-copy">"${e.copy}"</div>
      ${!e.conforms && e.driftNote ? `<div class="drift-note">${e.driftNote}</div>` : ''}
    </div>`;
        });
        html += `</div>`;
      }

      html += `</div></div>`;
    });

    html += `</body></html>`;
    downloadFile(`${selectedProject.name.toLowerCase().replace(/\s+/g, '-')}-reference.html`, html, 'text/html');
  };

  const downloadFile = (filename, content, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Views ──

  const goToProject = (project) => {
    setSelectedProject(project);
    setTypeFilter('all');
    setSearchQuery('');
    setView('project');
  };

  const goToEditor = (ct) => {
    setSelectedContentType(ct);
    setView('editor');
  };

  const goToAudit = (typeName) => {
    setAuditTypeId(typeName || allContentTypeNames[0] || '');
    setView('audit');
  };

  // ── Render ──

  if (view === 'welcome') {
    return <WelcomeScreen onCreateFolder={createFolder} onSelectFolder={selectFolder} />;
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading your library…</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar
        view={view}
        onDashboard={() => { setSelectedProject(null); setView('dashboard'); }}
        onAudit={() => goToAudit()}
        onSwitchLibrary={switchLibrary}
      />

      <main className="main-content">
        {view === 'dashboard' && (
          <Dashboard
            projects={projects}
            contentTypes={contentTypes}
            onOpenProject={goToProject}
            onNewProject={() => setShowNewProject(true)}
            onDeleteProject={deleteProject}
            onAudit={() => goToAudit()}
          />
        )}

        {view === 'project' && selectedProject && (
          <ProjectView
            project={selectedProject}
            contentTypes={filteredProjectTypes}
            typeFilter={typeFilter}
            searchQuery={searchQuery}
            onTypeFilter={setTypeFilter}
            onSearch={setSearchQuery}
            onOpenContentType={goToEditor}
            onNewContentType={() => setShowNewContentType(true)}
            onDeleteContentType={deleteContentType}
            onBack={() => { setSelectedProject(null); setView('dashboard'); }}
            showExport={showExport}
            onToggleExport={() => setShowExport(s => !s)}
            onCloseExport={() => setShowExport(false)}
            onExportAI={exportAIBriefing}
            onExportTeam={exportTeamDoc}
          />
        )}

        {view === 'editor' && selectedContentType && (
          <EditorView
            contentType={selectedContentType}
            project={selectedProject}
            onSave={saveContentType}
            onDelete={() => deleteContentType(selectedContentType.id)}
            onBack={() => setView('project')}
            onAudit={() => goToAudit(selectedContentType.name)}
            onPreviewImage={setPreviewImage}
          />
        )}

        {view === 'audit' && (
          <AuditView
            contentTypes={contentTypes}
            projects={projects}
            selectedTypeName={auditTypeId}
            onSelectType={setAuditTypeId}
            projectFilter={projectFilter}
            onProjectFilter={setProjectFilter}
            onPreviewImage={setPreviewImage}
            onExport={() => {
              const cts = contentTypes.filter(ct => ct.name === auditTypeId);
              const allExamples = cts.flatMap(ct => (ct.examples || []).map(e => ({
                ...e, ctName: ct.name, projectName: projects.find(p => p.id === ct.projectId)?.name
              })));
              const totalDrift = allExamples.filter(e => !e.conforms).length;
              let md = `# Audit: ${auditTypeId}\n\n`;
              md += `${allExamples.length} examples across ${cts.length} content type instance(s) · ${totalDrift} don't conform\n\n`;
              cts.forEach(ct => {
                const proj = projects.find(p => p.id === ct.projectId);
                md += `## ${proj?.name || 'Unknown project'}\n\n`;
                (ct.examples || []).forEach(e => {
                  md += `- **${e.surface}:** "${e.copy}" (${e.conforms ? '✓ Conforms' : '✗ Does not conform'})`;
                  if (!e.conforms && e.driftNote) md += `\n  - ${e.driftNote}`;
                  md += '\n';
                });
                md += '\n';
              });
              downloadFile(`audit-${auditTypeId.toLowerCase().replace(/\s+/g, '-')}.md`, md, 'text/markdown');
            }}
          />
        )}
      </main>

      {showNewProject && (
        <NewProjectModal
          onSave={createProject}
          onClose={() => setShowNewProject(false)}
        />
      )}

      {showNewContentType && selectedProject && (
        <NewContentTypeModal
          projectId={selectedProject.id}
          onSave={saveContentType}
          onClose={() => setShowNewContentType(false)}
        />
      )}

      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}

// ── Welcome Screen ────────────────────────────────────────────────────────────

function WelcomeScreen({ onCreateFolder, onSelectFolder }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-header">
          <div className="app-icon">
            <FileText size={40} />
          </div>
          <h1 className="welcome-title">Fieldwork</h1>
          <p className="welcome-description">
            A content architecture workbench. Define what your content is before deciding what it says.
          </p>
        </div>
        <div className="welcome-actions">
          <button onClick={onCreateFolder} className="choose-folder-btn primary">
            <Plus size={20} />
            Create new library
          </button>
          <button onClick={onSelectFolder} className="choose-folder-btn secondary">
            <Folder size={20} />
            Open existing library
          </button>
        </div>
        <p className="welcome-note">
          Your library lives as files on your computer. No accounts, no cloud.
        </p>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ view, onDashboard, onAudit, onSwitchLibrary }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-icon"><FileText size={16} /></div>
          <div className="brand-text">
            <h1>Fieldwork</h1>
          </div>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section-label">Workspace</div>
        <button
          className={`sidebar-nav-item ${['dashboard', 'project', 'editor'].includes(view) ? 'active' : ''}`}
          onClick={onDashboard}
        >
          <Grid size={14} />
          All projects
        </button>
        <button
          className={`sidebar-nav-item ${view === 'audit' ? 'active' : ''}`}
          onClick={onAudit}
          title="Pick a content type and see all its examples side by side, across every project"
        >
          <Search size={14} />
          Audit
        </button>
      </nav>
      <div className="sidebar-footer">
        <button
          className="sidebar-footer-btn"
          onClick={onSwitchLibrary}
          title="Open a different folder as your library"
        >
          <Folder size={13} />
          Switch library
        </button>
      </div>
    </aside>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ projects, contentTypes, onOpenProject, onNewProject, onDeleteProject, onAudit }) {
  const getProjectStats = (pid) => {
    const cts = contentTypes.filter(ct => ct.projectId === pid);
    const drift = cts.reduce((n, ct) => n + getDriftCount(ct), 0);
    const examples = cts.reduce((n, ct) => n + (ct.examples?.length || 0), 0);
    return { count: cts.length, drift, examples };
  };

  return (
    <div className="dashboard">
      <div className="dashboard-welcome">
        <h1>Your projects</h1>
      </div>

      <div className="projects-overview">
        <div className="projects-grid">
          {projects.map(project => {
            const stats = getProjectStats(project.id);
            const col = colorMap[project.color] || colorMap.blue;
            return (
              <div
                key={project.id}
                className="project-card-elegant"
                onClick={() => onOpenProject(project)}
                style={{ borderColor: col.border + '40' }}
              >
                <div className="project-card-actions">
                  <button
                    className="card-action-btn delete"
                    title="Delete project"
                    onClick={e => { e.stopPropagation(); onDeleteProject(project.id); }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="project-icon-elegant" style={{ background: col.bg }}>
                  <Folder size={20} style={{ color: col.icon }} />
                </div>
                <h4>{project.name}</h4>
                <p>{stats.count} content type{stats.count !== 1 ? 's' : ''}</p>
                <div className="project-meta">
                  {stats.drift > 0
                    ? <span className="drift-indicator">{stats.drift} out of sync</span>
                    : stats.examples > 0
                      ? <span className="conform-indicator">All match the rules</span>
                      : <span style={{ color: '#475569' }}>No examples yet</span>
                  }
                </div>
              </div>
            );
          })}

          <div className="project-card-elegant new-project-card" onClick={onNewProject}>
            <Plus size={20} style={{ color: '#64748b' }} />
            <h4 style={{ color: '#64748b' }}>New project</h4>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <div className="audit-entry-card" onClick={onAudit}>
          <div className="audit-entry-icon">
            <Search size={18} />
          </div>
          <div className="audit-entry-content">
            <h4>Compare across projects</h4>
            <p>Pick any content type and see every example side by side. Spot what's inconsistent and why.</p>
          </div>
          <ChevronRight size={16} style={{ color: '#64748b', flexShrink: 0 }} />
        </div>
      </div>
    </div>
  );
}

// ── Project View ──────────────────────────────────────────────────────────────

function ProjectView({
  project, contentTypes, typeFilter, searchQuery,
  onTypeFilter, onSearch, onOpenContentType, onNewContentType,
  onDeleteContentType, onBack, showExport, onToggleExport,
  onCloseExport, onExportAI, onExportTeam
}) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onCloseExport();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onCloseExport]);

  const col = colorMap[project.color] || colorMap.blue;

  return (
    <div className="project-view">
      <div className="view-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={14} /> Projects
        </button>
        <div className="view-header-title">
          <div className="project-header-icon" style={{ background: col.bg }}>
            <Folder size={14} style={{ color: col.icon }} />
          </div>
          {project.name}
        </div>
        <div className="view-header-actions">
          <div className="export-wrapper" ref={dropdownRef}>
            <button className="btn secondary" onClick={onToggleExport}>
              <Download size={14} /> Export
            </button>
            {showExport && (
              <div className="export-dropdown">
                <div className="export-dropdown-title">Export project</div>
                <div className="export-option" onClick={() => { onExportAI(); onCloseExport(); }}>
                  <div className="export-option-name">AI model briefing</div>
                  <div className="export-option-desc">Structured markdown for feeding to an AI writing partner. All models, jobs, rules, and examples.</div>
                </div>
                <div className="export-option" onClick={() => { onExportTeam(); onCloseExport(); }}>
                  <div className="export-option-name">Team reference doc</div>
                  <div className="export-option-desc">Clean HTML document with all models, examples, and conformance findings. Open in browser to print.</div>
                </div>
              </div>
            )}
          </div>
          <button className="btn primary" onClick={onNewContentType}>
            <Plus size={14} /> New content type
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-chips">
          {['all', 'element', 'pattern', 'system', 'drift'].map(f => (
            <button
              key={f}
              className={`filter-chip ${typeFilter === f ? 'active' : ''} ${f === 'drift' ? 'chip-drift' : ''}`}
              onClick={() => onTypeFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'drift' ? 'Out of sync' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="search-box">
          <Search size={13} />
          <input
            type="text"
            placeholder="Search content types…"
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="content-type-list">
        {contentTypes.length === 0 ? (
          <div className="empty-state">
            <FileText size={40} />
            <h4>No content types yet</h4>
            <p>Start by defining the first content type for {project.name}.</p>
            <button className="btn primary" onClick={onNewContentType}>
              <Plus size={14} /> New content type
            </button>
          </div>
        ) : (
          contentTypes.map(ct => {
            const drift = getDriftCount(ct);
            return (
              <div key={ct.id} className="ct-row" onClick={() => onOpenContentType(ct)}>
                <div className="ct-row-main">
                  <div className="ct-row-top">
                    <span className="ct-name">{ct.name}</span>
                    <div className="ct-badges">
                      <span
                        className={`badge ${TYPE_COLORS[ct.type] || 'badge-element'}`}
                        title={ct.type === 'element' ? 'Element: a single, standalone piece of copy' : ct.type === 'pattern' ? 'Pattern: two or more elements working together' : 'System: patterns that span an entire product area'}
                      >
                        {TYPE_LABELS[ct.type] || ct.type}
                      </span>
                      <span className={`badge ${STATUS_COLORS[ct.status] || 'badge-draft'}`}>
                        {ct.status === 'approved' ? 'Approved' : 'Draft'}
                      </span>
                      {ct.scope === 'org' && (
                        <span className="badge badge-org" title="Flagged as a candidate to share across all projects, not just this one">Company-wide</span>
                      )}
                    </div>
                  </div>
                  <div className="ct-job">{ct.whatItDoes}</div>
                  <div className="ct-stat">
                    {ct.examples?.length || 0} example{ct.examples?.length !== 1 ? 's' : ''}
                    {drift > 0
                      ? <span className="stat-drift"> · {drift} out of sync</span>
                      : ct.examples?.length > 0
                        ? <span className="stat-good"> · all match</span>
                        : null
                    }
                  </div>
                </div>
                <button
                  className="ct-delete-btn"
                  title="Delete"
                  onClick={e => { e.stopPropagation(); onDeleteContentType(ct.id); }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Editor View ───────────────────────────────────────────────────────────────

function EditorView({ contentType: initialCt, project, onSave, onDelete, onBack, onAudit, onPreviewImage }) {
  const [ct, setCt] = useState({ ...initialCt });
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setCt({ ...initialCt });
    setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCt.id]);

  const update = (changes) => {
    setCt(prev => ({ ...prev, ...changes }));
    setIsDirty(true);
  };

  // Rules
  const addRule = () => update({ rules: [...(ct.rules || []), { field: '', required: true, charRange: '', ifMissing: '' }] });
  const updateRule = (i, changes) => {
    const rules = (ct.rules || []).map((r, idx) => idx === i ? { ...r, ...changes } : r);
    update({ rules });
  };
  const removeRule = (i) => update({ rules: (ct.rules || []).filter((_, idx) => idx !== i) });

  // Surface differences
  const addSurface = () => update({ surfaceDifferences: [...(ct.surfaceDifferences || []), { surface: '', rule: '' }] });
  const updateSurface = (i, changes) => {
    const sd = (ct.surfaceDifferences || []).map((s, idx) => idx === i ? { ...s, ...changes } : s);
    update({ surfaceDifferences: sd });
  };
  const removeSurface = (i) => update({ surfaceDifferences: (ct.surfaceDifferences || []).filter((_, idx) => idx !== i) });

  // Examples
  const addExample = () => update({
    examples: [...(ct.examples || []), { id: generateId(), surface: '', copy: '', conforms: null, driftNote: '', screenshot: null }]
  });
  const updateExample = (i, changes) => {
    const examples = (ct.examples || []).map((e, idx) => idx === i ? { ...e, ...changes } : e);
    update({ examples });
  };
  const removeExample = (i) => update({ examples: (ct.examples || []).filter((_, idx) => idx !== i) });

  const handleScreenshot = (i, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => updateExample(i, { screenshot: e.target.result });
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSave(ct);
    setIsDirty(false);
  };

  const handleBack = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    onBack();
  };

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave(ct);
        setIsDirty(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [ct, onSave]);

  return (
    <div className="editor-view">
      <div className="view-header">
        <button className="back-btn" onClick={handleBack}>
          <ArrowLeft size={14} /> {project?.name}
        </button>
        <div className="view-header-title">{ct.name || 'Untitled'}</div>
        <div className="view-header-actions">
          <button className="btn ghost" onClick={onAudit} title="Compare this content type's examples side by side across all projects">Compare across projects</button>
          <button className="btn ghost danger" onClick={onDelete}>Delete</button>
          <button className={`btn primary ${isDirty ? 'btn-dirty' : ''}`} onClick={handleSave}>
            {isDirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      <div className="editor-scroll">
        <div className="editor-body">

          {/* What it is */}
          <section className="editor-section">
            <div className="section-title">What it is</div>
            <div className="field-grid-2">
              <div className="field-block">
                <label className="field-label">Name</label>
                <input
                  className="field-input"
                  value={ct.name}
                  onChange={e => update({ name: e.target.value })}
                  placeholder="e.g. Inline validation error"
                />
              </div>
              <div className="field-block">
                <label className="field-label">Type</label>
                <select className="field-input" value={ct.type} onChange={e => update({ type: e.target.value })}>
                  <option value="element">Element: single piece of copy</option>
                  <option value="pattern">Pattern: elements working together</option>
                  <option value="system">System: patterns across a product</option>
                </select>
              </div>
            </div>
            <div className="field-block">
              <label className="field-label">What it does</label>
              <textarea
                className="field-input field-textarea"
                value={ct.whatItDoes}
                onChange={e => update({ whatItDoes: e.target.value })}
                placeholder="One sentence. One job. Start with a verb: instruct, inform, ask, warn, reassure."
                rows={2}
              />
            </div>
          </section>

          {/* Rules */}
          <section className="editor-section">
            <div className="section-title-row">
              <div className="section-title">Rules</div>
              <button className="section-add-btn" onClick={addRule}><Plus size={12} /> Add rule</button>
            </div>
            {(ct.rules || []).length === 0 ? (
              <div className="empty-section-hint">No rules yet. Add the fields that every instance of this content type must include, and what breaks if they're missing.</div>
            ) : (
              <div className="rules-list">
                <div className="rules-header">
                  <span>Field</span><span>Required</span><span>Char range</span><span>If missing</span><span></span>
                </div>
                {(ct.rules || []).map((rule, i) => (
                  <div key={i} className="rule-row">
                    <input className="rule-input" value={rule.field} onChange={e => updateRule(i, { field: e.target.value })} placeholder="Field name" />
                    <select className="rule-input rule-select" value={rule.required} onChange={e => updateRule(i, { required: e.target.value === 'true' })}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                    <input className="rule-input" value={rule.charRange} onChange={e => updateRule(i, { charRange: e.target.value })} placeholder="10-60" />
                    <input className="rule-input" value={rule.ifMissing} onChange={e => updateRule(i, { ifMissing: e.target.value })} placeholder="What breaks?" />
                    <button className="rule-remove" onClick={() => removeRule(i)}><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Surface differences */}
          <section className="editor-section">
            <div className="section-title-row">
              <div className="section-title" title="Use this to note any rule exceptions for specific platforms or surfaces (e.g. mobile app vs. web vs. cluster)">Platform variations</div>
              <button className="section-add-btn" onClick={addSurface}><Plus size={12} /> Add variation</button>
            </div>
            {(ct.surfaceDifferences || []).length === 0 ? (
              <div className="empty-section-hint">Does the copy behave differently on mobile, web, or a specific surface? Add a note here.</div>
            ) : (
              <div className="surfaces-list">
                <div className="surface-row rules-header">
                  <span>Platform or screen</span>
                  <span>What's different</span>
                  <span></span>
                </div>
                {(ct.surfaceDifferences || []).map((s, i) => (
                  <div key={i} className="surface-row">
                    <input className="surface-input surface-name" value={s.surface} onChange={e => updateSurface(i, { surface: e.target.value })} placeholder="e.g. Mobile, Web" />
                    <input className="surface-input surface-rule" value={s.rule} onChange={e => updateSurface(i, { rule: e.target.value })} placeholder="e.g. Max 40 chars, no punctuation" />
                    <button className="rule-remove" onClick={() => removeSurface(i)}><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Ownership */}
          <section className="editor-section">
            <div className="section-title">Ownership</div>
            <div className="field-grid-2">
              <div className="field-block">
                <label className="field-label">Status</label>
                <select className="field-input" value={ct.status} onChange={e => update({ status: e.target.value })}>
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
              <div className="field-block">
                <label className="field-label" title="Who this content type applies to">Applies to</label>
                <select className="field-input" value={ct.scope} onChange={e => update({ scope: e.target.value })}>
                  <option value="product">This project only</option>
                  <option value="org">Candidate to share company-wide</option>
                </select>
              </div>
            </div>
          </section>

          {/* Examples */}
          <section className="editor-section">
            <div className="section-title-row">
              <div className="section-title">Examples</div>
              <button className="section-add-btn" onClick={addExample}><Plus size={12} /> Add example</button>
            </div>
            {(ct.examples || []).length === 0 ? (
              <div className="empty-section-hint">Add real copy from real surfaces. Mark whether each example follows the model.</div>
            ) : (
              (ct.examples || []).map((ex, i) => (
                <ExampleCard
                  key={ex.id || i}
                  example={ex}
                  index={i}
                  onChange={changes => updateExample(i, changes)}
                  onRemove={() => removeExample(i)}
                  onScreenshot={file => handleScreenshot(i, file)}
                  onPreview={onPreviewImage}
                />
              ))
            )}
            {(ct.examples || []).length > 0 && (
              <button className="add-example-btn" onClick={addExample}>
                <Plus size={13} /> Add another example
              </button>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}

// ── Example Card ──────────────────────────────────────────────────────────────

function ExampleCard({ example: ex, onChange, onRemove, onScreenshot, onPreview }) {
  const fileInputRef = useRef(null);
  const isDrift = ex.conforms === false;

  return (
    <div className={`example-card ${isDrift ? 'example-drift' : ''}`}>
      <div className={`example-card-header ${isDrift ? 'example-header-drift' : ''}`}>
        <input
          className="example-surface-input"
          value={ex.surface}
          onChange={e => onChange({ surface: e.target.value })}
          placeholder="Where? (e.g. App, Web, Cluster)"
        />
        <div className="conforms-toggle">
          <button
            className={`conform-btn ${ex.conforms === true ? 'conform-yes' : ''}`}
            onClick={() => onChange({ conforms: ex.conforms === true ? null : true })}
            title="Mark as conforming"
          >
            <CheckCircle size={13} /> Conforms
          </button>
          <button
            className={`conform-btn ${ex.conforms === false ? 'conform-no' : ''}`}
            onClick={() => onChange({ conforms: ex.conforms === false ? null : false })}
            title="Mark as not conforming"
          >
            <AlertCircle size={13} /> Doesn't conform
          </button>
        </div>
        <button className="rule-remove" onClick={onRemove}><X size={13} /></button>
      </div>
      <div className="example-card-body">
        {ex.screenshot ? (
          <div className="screenshot-filled" onClick={() => onPreview(ex.screenshot)}>
            <img src={ex.screenshot} alt="Screenshot" />
            <div className="screenshot-overlay">
              <Eye size={16} />
            </div>
            <button
              className="screenshot-remove"
              onClick={e => { e.stopPropagation(); onChange({ screenshot: null }); }}
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="screenshot-slot" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} />
            <span>Add screenshot</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => onScreenshot(e.target.files[0])}
            />
          </div>
        )}
        <textarea
          className="example-copy-input"
          value={ex.copy}
          onChange={e => onChange({ copy: e.target.value })}
          placeholder="The actual copy from this surface…"
          rows={2}
        />
        {isDrift && (
          <textarea
            className="drift-note-input"
            value={ex.driftNote}
            onChange={e => onChange({ driftNote: e.target.value })}
            placeholder="What rule does this break? Why doesn't it conform?"
            rows={2}
          />
        )}
      </div>
    </div>
  );
}

// ── Audit View ────────────────────────────────────────────────────────────────

function AuditView({ contentTypes, projects, selectedTypeName, onSelectType, onPreviewImage, onExport }) {
  const allTypeNames = [...new Set(contentTypes.map(ct => ct.name))].sort();
  const matchingCts = contentTypes.filter(ct => ct.name === selectedTypeName);
  const allExamples = matchingCts.flatMap(ct => {
    const proj = projects.find(p => p.id === ct.projectId);
    return (ct.examples || []).map(e => ({ ...e, projectName: proj?.name || 'Unknown', ctId: ct.id }));
  });

  const totalDrift = allExamples.filter(e => e.conforms === false).length;
  const totalConform = allExamples.filter(e => e.conforms === true).length;

  return (
    <div className="audit-view">
      <div className="view-header">
        <div className="view-header-title" title="Pick a content type to see all its examples side by side across every project">Compare across projects</div>
        <div className="view-header-actions">
          <button className="btn secondary" onClick={onExport}>
            <Download size={14} /> Export findings
          </button>
        </div>
      </div>

      <div className="audit-controls">
        <label className="audit-label">Which content type?</label>
        <select
          className="audit-select"
          value={selectedTypeName}
          onChange={e => onSelectType(e.target.value)}
        >
          {allTypeNames.length === 0 && <option value="">No content types yet</option>}
          {allTypeNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        {allExamples.length > 0 && (
          <span className="audit-meta">
            {allExamples.length} example{allExamples.length !== 1 ? 's' : ''} across {matchingCts.length} project{matchingCts.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {allExamples.length === 0 ? (
        <div className="audit-empty">
          <Search size={40} />
          <h4>{selectedTypeName ? `No examples for "${selectedTypeName}" yet` : 'Choose a content type above to get started'}</h4>
          <p>Add real examples to your content types and they'll appear here for comparison.</p>
        </div>
      ) : (
        <>
          <div className="audit-columns">
            {allExamples.map((ex, i) => (
              <div key={i} className={`audit-col ${ex.conforms === false ? 'audit-col-drift' : ''}`}>
                <div className={`audit-col-header ${ex.conforms === false ? 'audit-header-drift' : ''}`}>
                  <span className="audit-surface">{ex.surface || 'Unknown'}</span>
                  <span className="audit-project">· {ex.projectName}</span>
                  {ex.conforms === true && <span className="badge-conform-sm">conforms</span>}
                  {ex.conforms === false && <span className="badge-drift-sm">doesn't conform</span>}
                </div>
                <div className="audit-col-body">
                  {ex.screenshot ? (
                    <div className="audit-screenshot" onClick={() => onPreviewImage(ex.screenshot)}>
                      <img src={ex.screenshot} alt="Screenshot" />
                    </div>
                  ) : (
                    <div className="audit-screenshot-empty">No screenshot</div>
                  )}
                  <div className="audit-copy">"{ex.copy}"</div>
                  {ex.conforms === false && ex.driftNote && (
                    <div className="audit-drift-note">{ex.driftNote}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="audit-footer">
            <span className="audit-stat">
              <strong>{totalConform}/{allExamples.length}</strong> conform
            </span>
            {totalDrift > 0 && (
              <span className="audit-stat audit-stat-drift">
                <strong>{totalDrift}</strong> don't conform
              </span>
            )}
            {totalDrift === 0 && allExamples.length > 0 && (
              <span className="audit-stat audit-stat-good">All examples conform</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────

function NewProjectModal({ onSave, onClose }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), color);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>New project</h3>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Project name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Settings, Permissions, Onboarding"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Color</label>
            <div className="color-picker">
              {PROJECT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch ${color === c ? 'selected' : ''}`}
                  style={{ background: colorMap[c].icon }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={!name.trim()}>
              Create project
            </button>
            <button type="button" className="btn secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewContentTypeModal({ projectId, onSave, onClose }) {
  const [name, setName] = useState('');
  const [whatItDoes, setWhatItDoes] = useState('');
  const [type, setType] = useState('element');

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: generateId(),
      projectId,
      name: name.trim(),
      whatItDoes: whatItDoes.trim(),
      type,
      status: 'draft',
      scope: 'product',
      rules: [],
      surfaceDifferences: [],
      examples: [],
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>New content type</h3>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Inline validation error"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>What it does</label>
            <textarea
              value={whatItDoes}
              onChange={e => setWhatItDoes(e.target.value)}
              placeholder="One sentence. One job. Start with a verb."
              rows={2}
            />
            <small>Instruct, inform, ask, warn, or reassure. Not two of these.</small>
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={type} onChange={e => setType(e.target.value)}>
              <option value="element">Element: smallest functional unit</option>
              <option value="pattern">Pattern: elements working together</option>
              <option value="system">System: patterns across a product</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={!name.trim()}>
              Create
            </button>
            <button type="button" className="btn secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImagePreviewModal({ imageUrl, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay image-preview-overlay" onClick={onClose}>
      <div className="image-preview-content" onClick={e => e.stopPropagation()}>
        <button className="image-preview-close" onClick={onClose}><X size={20} /></button>
        <img src={imageUrl} alt="Preview" className="preview-image" />
      </div>
    </div>
  );
}

export default App;
