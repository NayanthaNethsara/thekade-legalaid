document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation Logic ---
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            btn.classList.add('active');
            const targetId = `${btn.dataset.tab}-view`;
            document.getElementById(targetId).classList.add('active');

            // Refresh data when switching tabs
            if (btn.dataset.tab === 'training') fetchSystemStatus();
            if (btn.dataset.tab === 'documents') fetchDocuments();
            if (btn.dataset.tab === 'users') fetchUsers();
        });
    });

    // --- API Host ---
    const API_BASE = ''; // Same origin

    // --- Training View ---
    const btnTrain = document.getElementById('btn-train');
    
    async function fetchSystemStatus() {
        try {
            const res = await fetch(`${API_BASE}/status`);
            const data = await res.json();
            
            document.getElementById('stat-docs').textContent = data.documents ?? 0;
            document.getElementById('stat-chunks').textContent = data.chunks ?? 0;
            
            if (data.last_ingested) {
                const date = new Date(data.last_ingested);
                document.getElementById('stat-last-time').textContent = date.toLocaleString();
            } else {
                document.getElementById('stat-last-time').textContent = 'Never';
            }
        } catch (e) {
            console.error('Failed to fetch status:', e);
        }
    }

    btnTrain.addEventListener('click', async () => {
        btnTrain.disabled = true;
        btnTrain.textContent = 'Processing...';
        document.getElementById('train-results').classList.add('hidden');
        
        try {
            const res = await fetch(`${API_BASE}/train`, { method: 'POST' });
            const data = await res.json();
            
            document.getElementById('res-ingested').textContent = data.summary.ingested;
            document.getElementById('res-skipped').textContent = data.summary.skipped;
            document.getElementById('res-errors').textContent = data.summary.errors;
            
            const list = document.getElementById('train-details-list');
            list.innerHTML = '';
            data.details.forEach(d => {
                const li = document.createElement('li');
                const statusColor = d.status === 'ingested' ? 'success-text' : 
                                  d.status === 'error' ? 'error-text' : 'neutral-text';
                li.innerHTML = `<strong>${d.file}</strong>: <span class="${statusColor}">${d.status}</span> ${d.reason ? '('+d.reason+')' : ''}`;
                list.appendChild(li);
            });
            
            document.getElementById('train-results').classList.remove('hidden');
            fetchSystemStatus();
        } catch (e) {
            console.error('Training failed:', e);
            alert('Training failed. Check console.');
        } finally {
            btnTrain.disabled = false;
            btnTrain.textContent = 'Start Training Pipeline';
        }
    });

    // --- Documents View ---
    async function fetchDocuments() {
        try {
            const res = await fetch(`${API_BASE}/documents?limit=50&offset=0`);
            const data = await res.json();
            
            const tbody = document.getElementById('docs-tbody');
            tbody.innerHTML = '';
            
            if (data.items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary)">No documents indexed yet.</td></tr>`;
                return;
            }
            
            data.items.forEach(doc => {
                const metaFileName = doc.metadata?.filename || doc.source;
                const date = new Date(doc.created_at).toLocaleDateString();
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${doc.id}</td>
                    <td><strong>${metaFileName}</strong></td>
                    <td>${date}</td>
                    <td><div class="preview-text">${doc.preview || 'No content'}</div></td>
                    <td><button class="btn secondary btn-sm" onclick="viewDocumentChunks(${doc.id}, this.closest('tr'))">View Chunks</button></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error('Failed to fetch documents:', e);
        }
    }

    // --- Users View ---
    async function fetchUsers() {
        try {
            const res = await fetch(`${API_BASE}/users?limit=50&offset=0`);
            const data = await res.json();
            
            const tbody = document.getElementById('users-tbody');
            tbody.innerHTML = '';
            
            if (data.items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">No users found.</td></tr>`;
                return;
            }
            
            data.items.forEach(user => {
                const date = new Date(user.created_at).toLocaleString();
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${user.phone_number}</strong></td>
                    <td>${date}</td>
                    <td><span class="badge ${user.status}" id="badge-${user.id}">${user.status}</span></td>
                    <td style="display:flex; align-items:center;">
                        <select class="status-select" id="select-${user.id}">
                            <option value="guest" ${user.status==='guest'?'selected':''}>Guest</option>
                            <option value="citizen" ${user.status==='citizen'?'selected':''}>Citizen</option>
                            <option value="lawyer" ${user.status==='lawyer'?'selected':''}>Lawyer</option>
                        </select>
                        <button class="btn secondary btn-sm" onclick="updateUserStatus(${user.id})">Update</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error('Failed to fetch users:', e);
        }
    }

    // Expose to window for inline onclick handler
    window.updateUserStatus = async (userId) => {
        const select = document.getElementById(`select-${userId}`);
        const newStatus = select.value;
        const btn = select.nextElementSibling;
        
        btn.disabled = true;
        btn.textContent = '...';
        
        try {
            const res = await fetch(`${API_BASE}/users/${userId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (!res.ok) throw new Error('Update failed');
            
            const data = await res.json();
            
            // Update badge color and text
            const badge = document.getElementById(`badge-${userId}`);
            badge.className = `badge ${data.status}`;
            badge.textContent = data.status;
            
            // reset UI state
            btn.textContent = 'Saved!';
            setTimeout(() => {
                btn.textContent = 'Update';
                btn.disabled = false;
            }, 1000);
            
        } catch (e) {
            console.error(e);
            alert('Failed to update user status');
            btn.disabled = false;
            btn.textContent = 'Update';
        }
    }

    window.viewDocumentChunks = async (docId, trElement) => {
        // Toggle if already open
        if (trElement.nextElementSibling && trElement.nextElementSibling.classList.contains('chunks-row')) {
            trElement.nextElementSibling.remove();
            return;
        }

        const btn = trElement.querySelector('button');
        const oldText = btn.textContent;
        btn.textContent = 'Loading...';
        btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/documents/${docId}?include_chunks=true`);
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            
            const chunksRow = document.createElement('tr');
            chunksRow.className = 'chunks-row';
            
            let html = '<td colspan="5" style="padding: 0;"><div style="max-height: 400px; overflow-y: auto; padding: 20px; background: #0f1115; border-bottom: 1px solid var(--border-color);">';
            
            if (data.chunks && data.chunks.length > 0) {
                html += `<h4 style="margin-bottom: 16px; color: var(--text-primary);">Document Chunks (${data.chunks.length})</h4><ul style="list-style: none;">`;
                data.chunks.forEach(c => {
                    html += `
                        <li style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px dashed rgba(255,255,255,0.1);">
                            <div style="color: var(--accent-color); font-weight: bold; margin-bottom: 8px;">[Chunk ${c.index}]</div>
                            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; white-space: pre-wrap; font-family: monospace;">${c.text}</p>
                        </li>
                    `;
                });
                html += '</ul>';
            } else {
                html += '<em>No chunks found or indexing failed.</em>';
            }
            
            html += '</div></td>';
            chunksRow.innerHTML = html;
            trElement.parentNode.insertBefore(chunksRow, trElement.nextSibling);
            
        } catch (e) {
            console.error('Failed to load chunks:', e);
            alert('Failed to load document chunks. Check server logs.');
        } finally {
            btn.textContent = oldText;
            btn.disabled = false;
        }
    }

    // --- Init ---
    fetchSystemStatus(); // Load initial data for first tab
});
