# Book Series Planner

A beautiful, minimalistic web application for planning and organizing your book series. Features real-time auto-save functionality using localStorage, ensuring your data persists across sessions even when you close or refresh the page.

## Features

✨ **Clean, Modern Interface** - Minimalistic design with a beautiful gradient background and card-based layout

📚 **Multiple Series Support** - Create and manage as many book series as you need

💾 **Real-time Auto-Save** - All changes are automatically saved to localStorage instantly

✏️ **Inline Editing** - Edit series names and descriptions directly on the cards

🖼️ **Cover Images** - Add cover images via URL to visually distinguish your series

📅 **Auto Timestamps** - Creation date is automatically tracked for each series

🗑️ **Easy Deletion** - Remove series you no longer need with a single click

## Usage

Simply open `index.html` in your web browser. No installation or server required!

### Creating a Series

1. Click the "+ New Series" button
2. Fill in the series name, description, and optionally a cover image URL
3. Click "Create Series"
4. Your series is instantly created and saved

### Editing a Series

- Click on the title or description to edit them directly
- Changes are saved automatically as you type
- No need to click save - it's all done in real-time!

### Deleting a Series

- Click the "Delete" button on any series card
- Confirm the deletion
- The series is permanently removed

## Technical Details

- Pure vanilla JavaScript (no frameworks required)
- localStorage for data persistence
- Responsive grid layout
- No backend needed - runs entirely in the browser

## Files

- `index.html` - Main HTML structure
- `styles.css` - All styling and design
- `app.js` - Application logic and localStorage management

## Browser Compatibility

Works in all modern browsers that support localStorage:
- Chrome, Firefox, Safari, Edge
- Mobile browsers on iOS and Android

## Data Storage

All data is stored locally in your browser using localStorage. This means:
- ✅ Data persists across page refreshes and browser restarts
- ✅ No internet connection required after initial load
- ⚠️ Data is specific to the browser and domain
- ⚠️ Clearing browser data or cache will remove your series

---

Built with ❤️ for writers and storytellers
