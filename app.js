// Book Series Planner App
class BookPlanner {
    constructor() {
        this.series = this.loadSeries();
        this.init();
    }

    init() {
        this.renderSeries();
        this.attachEventListeners();
    }

    attachEventListeners() {
        const modal = document.getElementById('modal');
        const addBtn = document.getElementById('addSeriesBtn');
        const closeBtn = document.querySelector('.close');
        const form = document.getElementById('seriesForm');

        addBtn.addEventListener('click', () => {
            modal.classList.add('active');
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            form.reset();
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                form.reset();
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createSeries(e.target);
            modal.classList.remove('active');
            form.reset();
        });
    }

    createSeries(form) {
        const formData = new FormData(form);
        const newSeries = {
            id: Date.now().toString(),
            name: formData.get('name'),
            description: formData.get('description'),
            coverImage: formData.get('coverImage') || '',
            dateCreated: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        };

        this.series.push(newSeries);
        this.saveSeries();
        this.renderSeries();
    }

    updateSeries(id, field, value) {
        const series = this.series.find(s => s.id === id);
        if (series) {
            series[field] = value;
            this.saveSeries();
        }
    }

    deleteSeries(id) {
        this.series = this.series.filter(s => s.id !== id);
        this.saveSeries();
        this.renderSeries();
    }

    renderSeries() {
        const container = document.getElementById('seriesList');
        
        if (this.series.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h2>No Series Yet</h2>
                    <p>Click "New Series" to create your first book series!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        
        this.series.forEach(series => {
            const card = document.createElement('div');
            card.className = 'series-card';
            card.dataset.id = series.id;
            
            const cover = document.createElement('div');
            cover.className = 'series-cover';
            
            if (series.coverImage) {
                const img = document.createElement('img');
                img.src = series.coverImage;
                img.alt = series.name;
                cover.appendChild(img);
            } else {
                cover.textContent = series.name.charAt(0).toUpperCase();
            }
            
            const content = document.createElement('div');
            content.className = 'series-content';
            
            const title = document.createElement('input');
            title.type = 'text';
            title.className = 'series-title';
            title.value = series.name;
            title.dataset.field = 'name';
            title.dataset.id = series.id;
            
            const description = document.createElement('textarea');
            description.className = 'series-description';
            description.value = series.description;
            description.dataset.field = 'description';
            description.dataset.id = series.id;
            
            const meta = document.createElement('div');
            meta.className = 'series-meta';
            
            const date = document.createElement('span');
            date.className = 'series-date';
            date.textContent = `Created: ${series.dateCreated}`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-danger';
            deleteBtn.textContent = 'Delete';
            deleteBtn.dataset.delete = series.id;
            
            meta.appendChild(date);
            meta.appendChild(deleteBtn);
            
            content.appendChild(title);
            content.appendChild(description);
            content.appendChild(meta);
            
            card.appendChild(cover);
            card.appendChild(content);
            
            container.appendChild(card);
        });

        this.attachSeriesEventListeners();
    }

    attachSeriesEventListeners() {
        document.querySelectorAll('.series-title, .series-description').forEach(input => {
            input.addEventListener('input', (e) => {
                const id = e.target.dataset.id;
                const field = e.target.dataset.field;
                const value = e.target.value;
                this.updateSeries(id, field, value);
            });
        });

        document.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.delete;
                if (confirm('Are you sure you want to delete this series?')) {
                    this.deleteSeries(id);
                }
            });
        });
    }

    saveSeries() {
        localStorage.setItem('bookSeries', JSON.stringify(this.series));
    }

    loadSeries() {
        const saved = localStorage.getItem('bookSeries');
        return saved ? JSON.parse(saved) : [];
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BookPlanner();
});
