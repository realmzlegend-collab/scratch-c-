const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// 1. Basic Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Serve Static Assets (Ensures logo.svg and frontend files are accessible)
app.use(express.static(path.join(__dirname, '../frontend')));

// 3. Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Database Connected Successfully'))
    .catch(err => console.error('❌ Database Connection Error:', err));

// 4. THE LOGO & ADS INJECTOR
const injectAssets = (html) => {
    // Script to force the logo.svg onto image tags or logo classes
    const logoScript = `
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const logoTargets = document.querySelectorAll('img[src*="logo"], .logo, #logo, .brand img');
            logoTargets.forEach(el => {
                if(el.tagName === 'IMG') {
                    el.src = '/logo.svg'; 
                } else {
                    el.style.backgroundImage = "url('/logo.svg')";
                    el.style.backgroundSize = "contain";
                    el.style.backgroundRepeat = "no-repeat";
                }
            });
        });
    </script>`;

    // Google Ads Script
    const adsScript = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7111358981076444" crossorigin="anonymous"></script>';

    // Insert scripts before the closing </head> tag
    return html.replace('</head>', adsScript + '\n' + logoScript + '\n</head>');
};

// Helper function to serve pages with the injected logo
const servePage = (pageName, res) => {
    const filePath = path.join(__dirname, '../frontend/' + pageName);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        res.send(injectAssets(content));
    } else {
        res.status(404).send("Page not found in frontend folder");
    }
};

// 5. API ROUTES (Linking all 8 necessary files)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/reading', require('./routes/reading'));
app.use('/api/cinema', require('./routes/cinema'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/public', require('./routes/public'));
app.use('/api/transfer', require('./routes/transfer'));

// 6. PAGE ROUTING
app.get('/', (req, res) => servePage('index.html', res));
app.get('/dashboard', (req, res) => servePage('dashboard.html', res));
app.get('/reading', (req, res) => servePage('reading.html', res));
app.get('/cinema', (req, res) => servePage('cinema.html', res));
app.get('/marketplace', (req, res) => servePage('marketplace.html', res));
app.get('/profile', (req, res) => servePage('profile.html', res));
app.get('/admin', (req, res) => servePage('admin.html', res));

// 7. Health Check
app.get('/status', (req, res) => res.json({ status: 'online', logoInjection: 'active' }));

// 8. SERVER START (Clean Syntax for Render)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log("🚀 Server running on port " + PORT);
});
