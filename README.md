# Canvas v1.0.0 - Chemistry Editor for Chemora AI

**The "Android TV" Chemistry Drawing Platform**

Built by: Dr. Nagendar (SciChem AI Technologies)  
Date: March 28, 2026  
Architecture: Plugin-based, future-proof chemistry canvas

---

## 🎯 Vision

Canvas v1.0.0 is designed as an **"Android TV"** for chemistry:
- **Not a portable TV** (fixed features like Ketcher)
- **Like Android TV**: Plug in any feature, it works!
- **Future-proof**: New Chemora features? Just add a plugin
- **AI-native**: Built specifically for Chemora AI platform

---

## ✅ What's Built (Phase 1 - TODAY!)

### **Core Foundation**
- ✅ Vite + React + TypeScript
- ✅ Zustand state management (lighter than Redux)
- ✅ HTML5 Canvas rendering (faster than SVG)
- ✅ Clean architecture (domain/UI separation)

### **Chemistry Engine**
- ✅ Vec2 math (from Ketcher - Apache 2.0)
- ✅ Atom/Bond entities with stereochemistry
- ✅ Molecule container
- ✅ Chemistry constants (bond lengths, angles, colors)

### **Rendering System**
- ✅ Canvas renderer with anti-aliasing
- ✅ Single/double/triple bonds
- ✅ Wedge/hash/wavy stereochemistry bonds
- ✅ Aromatic bonds (dashed)
- ✅ Atom labels with CPK colors
- ✅ Charge display

### **User Interface**
- ✅ Main canvas with mouse interaction
- ✅ Toolbar with tool selection
- ✅ Selection highlighting
- ✅ Undo/redo support (history stack)

### **Test Features**
- ✅ "Add Benzene" button (proof of concept)
- ✅ Clear canvas
- ✅ Atom selection

---

## 🚀 How to Run

```bash
cd Canvas_v1.0.0
npm install
npm run dev
```

Then open: **http://localhost:5173**

Click **"⬡ Add Benzene"** to see it work!

---

## 📁 Project Structure

```
Canvas_v1.0.0/
├── src/
│   ├── core/                    # Canvas engine
│   │   ├── Canvas.tsx          # Main canvas component
│   │   ├── StateManager.ts     # Zustand store
│   │   └── Toolbar.tsx         # Tool selection UI
│   │
│   ├── entities/                # Chemistry objects (from Ketcher)
│   │   ├── Vec2.ts             # 2D vector math
│   │   ├── Atom.ts             # Atom entity
│   │   ├── Bond.ts             # Bond entity
│   │   └── Molecule.ts         # Molecule container
│   │
│   ├── engines/                 # Chemistry engines
│   │   └── ChemistryConstants.ts # Bond lengths, angles, colors
│   │
│   ├── renderers/               # Drawing implementations
│   │   └── CanvasRenderer.ts   # HTML5 Canvas renderer
│   │
│   ├── plugins/                 # 🔥 FUTURE: ALL FEATURES HERE
│   │
│   └── App.tsx                  # Main application
│
└── README.md
```

---

## 🔮 Next Steps

### **Phase 2: Drawing Tools** (Week 1-2)
- Bond Tool (click-drag to draw)
- Ring Tool (place rings 3-8)
- Chain Tool
- Functional Groups

### **Phase 3: Plugin System** (Week 2-3)
- EventBus
- PluginRegistry
- Plugin templates

### **Phase 4: Chemora Integration** (Week 3-4)
- AI Prediction Plugin (9-cell TDA)
- Export Plugin (Excel, PPT, Word)
- Reaction Bank Plugin
- Analysis tools

### **Phase 5: Chemistry Engines** (Week 4-5)
- Indigo WASM (SMILES, layout)
- RDKit.js (calculations)

---

## 📜 License

**Canvas v1.0.0**: Copyright © 2026 SciChem AI Technologies

**Portions derived from:**
- [Ketcher](https://github.com/epam/ketcher) (Apache 2.0 License)

---

**Built with ❤️ for chemistry by chemists** 🚀
