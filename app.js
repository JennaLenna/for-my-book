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

        container.innerHTML = this.series.map(series => `
            <div class="series-card" data-id="${series.id}">
                <div class="series-cover">
                    ${series.coverImage ? 
                        `<img src="${series.coverImage}" alt="${series.name}">` : 
                        series.name.charAt(0).toUpperCase()
                    }
                </div>
                <div class="series-content">
                    <input 
                        type="text" 
                        class="series-title" 
                        value="${series.name}"
                        data-field="name"
                        data-id="${series.id}"
                    >
                    <textarea 
                        class="series-description"
                        data-field="description"
                        data-id="${series.id}"
                    >${series.description}</textarea>
                    <div class="series-meta">
                        <span class="series-date">Created: ${series.dateCreated}</span>
                        <button class="btn-danger" data-delete="${series.id}">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');

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
