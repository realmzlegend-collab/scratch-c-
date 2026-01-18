const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log('MongoDB Connection Error:', err));

// Telegram Web App validation function
const validateTelegramData = (req, res, next) => {
    // Skip validation for development mode
    if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ Development mode: Skipping Telegram validation');
        return next();
    }

    const initData = req.headers['x-telegram-init-data'] || req.body.initData || req.query.initData;
    
    // If no initData, just continue (for traditional signup/login)
    if (!initData) {
        console.log('ℹ️ No Telegram initData - traditional auth');
        return next();
    }

    try {
        // Parse the initData string
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        
        // Remove hash from params for validation
        params.delete('hash');
        
        // Sort keys alphabetically
        const dataCheckArr = [];
        for (const [key, value] of params.entries()) {
            dataCheckArr.push(`${key}=${value}`);
        }
        dataCheckArr.sort((a, b) => a.localeCompare(b));
        
        const dataCheckString = dataCheckArr.join('\n');
        
        // Create secret key using HMAC SHA256
        const secretKey = crypto.createHmac('sha256', 'WebAppData')
            .update(process.env.BOT_TOKEN)
            .digest();
        
        // Calculate HMAC SHA256 hash
        const calculatedHash = crypto.createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        
        if (calculatedHash === hash) {
            // Extract user data from initData
            const userStr = params.get('user');
            if (userStr) {
                req.telegramUser = JSON.parse(userStr);
            }
            
            // Extract auth_date and check if it's not too old (24 hours)
            const authDate = parseInt(params.get('auth_date'));
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (currentTime - authDate > 86400) { // 24 hours
                return res.status(401).json({
                    success: false,
                    error: 'Session expired',
                    message: 'Please reopen the app from Telegram'
                });
            }
            
            console.log(`✅ Telegram user authenticated: ${req.telegramUser?.username || req.telegramUser?.id}`);
            next();
        } else {
            res.status(401).json({
                success: false,
                error: 'Invalid Telegram authentication',
                message: 'Security validation failed'
            });
        }
    } catch (error) {
        console.error('Telegram validation error:', error);
        res.status(401).json({
            success: false,
            error: 'Telegram validation failed',
            message: 'Authentication error'
        });
    }
};

// Route for Telegram auth test
app.get('/api/auth/telegram/test', (req, res) => {
    res.json({
        success: true,
        message: 'Telegram auth endpoint is working',
        requiresBotToken: !!process.env.BOT_TOKEN
    });
});

// Routes - IMPORTANT: auth routes DON'T use validateTelegramData middleware
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reading', validateTelegramData, require('./routes/reading'));
app.use('/api/cinema', validateTelegramData, require('./routes/cinema'));
app.use('/api/marketplace', validateTelegramData, require('./routes/marketplace'));
app.use('/api/admin', validateTelegramData, require('./routes/admin'));

// Public routes (no Telegram auth required)
app.use('/api/public', require('./routes/public'));

// Function to inject scripts into HTML pages automatically
const injectScriptsIntoHTML = (html) => {
    // Inject Google Ads script into head
    const googleAdsScript = `
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7111358981076444" crossorigin="anonymous"></script>
    <script>
        (adsbygoogle = window.adsbygoogle || []).push({});
    </script>`;
    
    // Inject Telegram Web App SDK if not present
    if (!html.includes('telegram-web-app.js')) {
        const telegramSDK = '<script src="https://telegram.org/js/telegram-web-app.js"></script>';
        html = html.replace('</head>', `${telegramSDK}\n</head>`);
    }
    
    // Inject Google Ads script if not present
    if (!html.includes('adsbygoogle.js')) {
        html = html.replace('</head>', `${googleAdsScript}\n</head>`);
    }
    
    // Inject Telegram authentication and ads initialization script
    const initScript = `
    <script>
        // Telegram Web App initialization
        const tg = window.Telegram?.WebApp;
        
        if (tg) {
            // Expand Telegram Web App to full screen
            try {
                tg.expand();
                tg.enableClosingConfirmation();
            } catch (e) {
                console.log('Telegram WebApp expand error:', e.message);
            }
            
            // Set up Telegram theme colors
            const themeColors = tg.themeParams || {};
            if (themeColors.bg_color) {
                document.documentElement.style.setProperty('--tg-bg-color', themeColors.bg_color);
                document.body.style.backgroundColor = themeColors.bg_color;
            }
            if (themeColors.text_color) {
                document.documentElement.style.setProperty('--tg-text-color', themeColors.text_color);
                document.body.style.color = themeColors.text_color;
            }
            
            // Authenticate with Telegram if needed
            const initData = tg.initData;
            const telegramUser = tg.initDataUnsafe?.user;
            
            // Only auto-authenticate if we have initData
            if (initData && !localStorage.getItem('token')) {
                // Check if this is a signup/login page
                const isAuthPage = window.location.pathname.includes('signup') || 
                                   window.location.pathname.includes('login') ||
                                   window.location.pathname === '/' ||
                                   window.location.pathname === '/index.html';
                
                // Don't auto-auth on signup/login pages
                if (!isAuthPage) {
                    console.log('Auto-authenticating with Telegram...');
                    
                    fetch('/api/auth/telegram', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ initData })
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Telegram auth failed: ' + response.status);
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (data.success && data.token) {
                            localStorage.setItem('token', data.token);
                            localStorage.setItem('user', JSON.stringify(data.user));
                            
                            // Update UI with user info
                            updateUserUI(data.user);
                            
                            console.log('✅ Telegram authentication successful');
                        }
                    })
                    .catch(error => {
                        console.error('Telegram auth error:', error.message);
                        // Don't show error to user, just continue
                    });
                }
            }
            
            // Store Telegram data for future API calls
            window.telegramInitData = initData;
            window.telegramUser = telegramUser;
        }
        
        // Function to update UI with user info
        function updateUserUI(user) {
            if (!user) return;
            
            // Update username
            const usernameElements = document.querySelectorAll('[data-username]');
            usernameElements.forEach(el => {
                el.textContent = user.username || user.displayName || 'User';
            });
            
            // Update display name
            const displayNameElements = document.querySelectorAll('[data-displayname]');
            displayNameElements.forEach(el => {
                el.textContent = user.displayName || user.username || 'User';
            });
            
            // Update balance
            const balanceElements = document.querySelectorAll('[data-balance]');
            balanceElements.forEach(el => {
                el.textContent = user.balance || 0;
            });
            
            // Update profile picture
            const profilePicElements = document.querySelectorAll('[data-profilepic]');
            profilePicElements.forEach(el => {
                if (el.tagName === 'IMG' && user.profilePic) {
                    el.src = user.profilePic;
                }
            });
            
            // Show/hide admin elements
            const adminElements = document.querySelectorAll('[data-admin]');
            adminElements.forEach(el => {
                el.style.display = user.isAdmin ? 'block' : 'none';
            });
        }
        
        // Check if user is already authenticated
        document.addEventListener('DOMContentLoaded', function() {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            
            if (token && user._id) {
                updateUserUI(user);
                
                // Configure fetch to use token
                const originalFetch = window.fetch;
                window.fetch = function(url, options = {}) {
                    if (typeof url === 'string' && url.startsWith('/api/')) {
                        options.headers = {
                            ...options.headers,
                            'Content-Type': 'application/json',
                            'Authorization': \`Bearer \${token}\`
                        };
                    }
                    return originalFetch.call(this, url, options);
                };
            } else if (window.telegramInitData) {
                // If in Telegram but no token yet, use Telegram initData
                const originalFetch = window.fetch;
                window.fetch = function(url, options = {}) {
                    if (typeof url === 'string' && url.startsWith('/api/')) {
                        options.headers = {
                            ...options.headers,
                            'Content-Type': 'application/json',
                            'x-telegram-init-data': window.telegramInitData
                        };
                    }
                    return originalFetch.call(this, url, options);
                };
            }
            
            // Auto-refresh Google Ads every 30 seconds
            setInterval(() => {
                if (window.adsbygoogle) {
                    try {
                        (adsbygoogle = window.adsbygoogle || []).push({});
                    } catch (e) {
                        console.log('Ads refresh:', e.message);
                    }
                }
            }, 30000);
        });
    </script>`;
    
    // Inject the initialization script before closing body
    html = html.replace('</body>', `${initScript}\n</body>`);
    
    return html;
};

// Function to serve HTML pages with auto-injected scripts
const servePageWithScripts = (filePath, res) => {
    const fs = require('fs');
    
    if (fs.existsSync(filePath)) {
        let html = fs.readFileSync(filePath, 'utf8');
        
        // Auto-inject all necessary scripts
        html = injectScriptsIntoHTML(html);
        
        res.send(html);
    } else {
        res.status(404).send('Page not found');
    }
};

// Serve frontend HTML pages with automatic script injection
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Scratch C - Welcome</title>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            body {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
                padding: 20px;
            }
            .container {
                max-width: 500px;
                margin: 0 auto;
                text-align: center;
                padding: 40px 20px;
                background: rgba(255,255,255,0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                margin-top: 50px;
            }
            h1 {
                font-size: 2.5rem;
                margin-bottom: 20px;
                color: #FFD700;
            }
            .auth-options {
                margin: 30px 0;
            }
            .auth-btn {
                display: block;
                width: 100%;
                padding: 15px;
                margin: 10px 0;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
            }
            .telegram-btn {
                background: #2AABEE;
                color: white;
            }
            .signup-btn {
                background: #FFD700;
                color: black;
            }
            .login-btn {
                background: transparent;
                color: white;
                border: 2px solid #FFD700;
            }
            .auth-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            .dev-mode {
                margin-top: 30px;
                padding: 15px;
                background: rgba(0,0,0,0.2);
                border-radius: 10px;
                font-size: 14px;
            }
            .dev-mode a {
                color: #FFD700;
                text-decoration: none;
                font-weight: bold;
            }
            .telegram-status {
                background: rgba(0,0,0,0.2);
                padding: 15px;
                border-radius: 10px;
                margin: 20px 0;
                font-family: monospace;
                text-align: left;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📱 Scratch C</h1>
            <p>Earn credits by reading books and watching movies!</p>
            
            <div class="telegram-status" id="telegramStatus">
                <strong>Status:</strong> <span id="statusText">Loading...</span>
            </div>
            
            <div class="auth-options" id="authOptions">
                <button class="auth-btn telegram-btn" onclick="openTelegramApp()">
                    📱 Open in Telegram
                </button>
                <button class="auth-btn signup-btn" onclick="window.location.href='/signup'">
                    📝 Traditional Sign Up
                </button>
                <button class="auth-btn login-btn" onclick="window.location.href='/login'">
                    🔑 Login
                </button>
            </div>
            
            <div class="dev-mode">
                <p><a href="/dashboard">👨‍💻 Open Dashboard (Developer Mode)</a></p>
                <p><small>Use this if you're testing without Telegram</small></p>
            </div>
        </div>
        
        <script>
            // Check Telegram Web App status
            const tg = window.Telegram?.WebApp;
            const statusText = document.getElementById('statusText');
            const authOptions = document.getElementById('authOptions');
            
            if (tg && tg.initDataUnsafe.user) {
                // User is in Telegram Web App
                const user = tg.initDataUnsafe.user;
                statusText.innerHTML = \`✅ Telegram: <strong>\${user.first_name || user.username}</strong>\`;
                
                // Auto-redirect to dashboard after 2 seconds
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 2000);
                
                // Store Telegram data
                localStorage.setItem('telegramInitData', tg.initData);
                localStorage.setItem('telegramUser', JSON.stringify(user));
                
                // Expand app
                tg.expand();
                tg.enableClosingConfirmation();
            } else {
                statusText.innerHTML = 'ℹ️ Not in Telegram Web App';
            }
            
            function openTelegramApp() {
                const botUrl = 'https://t.me/CINETASKbot/Scratch';
                window.open(botUrl, '_blank');
                
                // If on mobile, try to open Telegram app
                if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                    window.location.href = 'tg://resolve?domain=CINETASKbot&startapp=Scratch';
                }
            }
        </script>
    </body>
    </html>
    `;
    
    // Inject Google Ads into the home page too
    const htmlWithAds = injectScriptsIntoHTML(html);
    res.send(htmlWithAds);
});

// Serve signup page (traditional signup)
app.get('/signup', (req, res) => {
    const signupHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Sign Up - Scratch C</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            body {
                background: var(--tg-bg-color, #121212);
                color: var(--tg-text-color, white);
                min-height: 100vh;
                padding: 20px;
            }
            .container {
                max-width: 400px;
                margin: 0 auto;
                padding: 40px 20px;
            }
            h1 {
                text-align: center;
                margin-bottom: 30px;
                color: #FFD700;
            }
            .form-group {
                margin-bottom: 20px;
            }
            .form-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
            }
            .form-group input {
                width: 100%;
                padding: 12px;
                background: rgba(255,255,255,0.1);
                border: 1px solid #444;
                border-radius: 8px;
                color: white;
                font-size: 16px;
            }
            .btn {
                width: 100%;
                padding: 14px;
                background: #FFD700;
                color: black;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                margin: 10px 0;
            }
            .btn:hover {
                background: #FFA500;
            }
            .back-btn {
                background: transparent;
                color: #FFD700;
                border: 2px solid #FFD700;
            }
            .message {
                padding: 10px;
                border-radius: 5px;
                margin: 15px 0;
                text-align: center;
                display: none;
            }
            .success {
                background: rgba(0,255,0,0.1);
                border: 1px solid #00FF00;
            }
            .error {
                background: rgba(255,0,0,0.1);
                border: 1px solid #FF0000;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📝 Sign Up</h1>
            
            <div id="message" class="message"></div>
            
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="username" placeholder="Choose a username">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="email" placeholder="your@email.com">
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="password" placeholder="Create a password">
            </div>
            
            <button class="btn" onclick="signup()">Create Account</button>
            <button class="btn back-btn" onclick="window.location.href='/'">← Back to Home</button>
        </div>
        
        <script>
            async function signup() {
                const username = document.getElementById('username').value;
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                // Basic validation
                if (!username || !email || !password) {
                    showMessage('Please fill all fields', 'error');
                    return;
                }
                
                if (password.length < 6) {
                    showMessage('Password must be at least 6 characters', 'error');
                    return;
                }
                
                try {
                    const response = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ username, email, password })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        showMessage('Account created successfully!', 'success');
                        
                        // Store token and user
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        
                        // Redirect to dashboard after 2 seconds
                        setTimeout(() => {
                            window.location.href = '/dashboard';
                        }, 2000);
                    } else {
                        showMessage(data.error || 'Signup failed', 'error');
                    }
                } catch (error) {
                    showMessage('Network error. Please try again.', 'error');
                    console.error('Signup error:', error);
                }
            }
            
            function showMessage(text, type) {
                const messageDiv = document.getElementById('message');
                messageDiv.textContent = text;
                messageDiv.className = 'message ' + type;
                messageDiv.style.display = 'block';
            }
        </script>
    </body>
    </html>
    `;
    
    const htmlWithAds = injectScriptsIntoHTML(signupHtml);
    res.send(htmlWithAds);
});

// Serve login page (traditional login)
app.get('/login', (req, res) => {
    const loginHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Login - Scratch C</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            body {
                background: var(--tg-bg-color, #121212);
                color: var(--tg-text-color, white);
                min-height: 100vh;
                padding: 20px;
            }
            .container {
                max-width: 400px;
                margin: 0 auto;
                padding: 40px 20px;
            }
            h1 {
                text-align: center;
                margin-bottom: 30px;
                color: #FFD700;
            }
            .form-group {
                margin-bottom: 20px;
            }
            .form-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
            }
            .form-group input {
                width: 100%;
                padding: 12px;
                background: rgba(255,255,255,0.1);
                border: 1px solid #444;
                border-radius: 8px;
                color: white;
                font-size: 16px;
            }
            .btn {
                width: 100%;
                padding: 14px;
                background: #FFD700;
                color: black;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                margin: 10px 0;
            }
            .btn:hover {
                background: #FFA500;
            }
            .back-btn {
                background: transparent;
                color: #FFD700;
                border: 2px solid #FFD700;
            }
            .message {
                padding: 10px;
                border-radius: 5px;
                margin: 15px 0;
                text-align: center;
                display: none;
            }
            .success {
                background: rgba(0,255,0,0.1);
                border: 1px solid #00FF00;
            }
            .error {
                background: rgba(255,0,0,0.1);
                border: 1px solid #FF0000;
            }
            .forgot-link {
                text-align: center;
                margin-top: 15px;
            }
            .forgot-link a {
                color: #FFD700;
                text-decoration: none;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔑 Login</h1>
            
            <div id="message" class="message"></div>
            
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="email" placeholder="your@email.com">
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="password" placeholder="Your password">
            </div>
            
            <button class="btn" onclick="login()">Login</button>
            <button class="btn back-btn" onclick="window.location.href='/'">← Back to Home</button>
            
            <div class="forgot-link">
                <a href="#" onclick="forgotPassword()">Forgot password?</a>
            </div>
        </div>
        
        <script>
            async function login() {
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                // Basic validation
                if (!email || !password) {
                    showMessage('Please fill all fields', 'error');
                    return;
                }
                
                try {
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email, password })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        showMessage('Login successful!', 'success');
                        
                        // Store token and user
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        
                        // Redirect to dashboard after 1 second
                        setTimeout(() => {
                            window.location.href = '/dashboard';
                        }, 1000);
                    } else {
                        showMessage(data.error || 'Login failed', 'error');
                    }
                } catch (error) {
                    showMessage('Network error. Please try again.', 'error');
                    console.error('Login error:', error);
                }
            }
            
            function forgotPassword() {
                const email = prompt('Enter your email to reset password:');
                if (email) {
                    showMessage('Password reset instructions sent to ' + email, 'success');
                }
            }
            
            function showMessage(text, type) {
                const messageDiv = document.getElementById('message');
                messageDiv.textContent = text;
                messageDiv.className = 'message ' + type;
                messageDiv.style.display = 'block';
            }
        </script>
    </body>
    </html>
    `;
    
    const htmlWithAds = injectScriptsIntoHTML(loginHtml);
    res.send(htmlWithAds);
});

// Serve all other pages with automatic script injection
app.get('/dashboard', (req, res) => {
    servePageWithScripts(path.join(__dirname, '../frontend/dashboard.html'), res);
});

app.get('/reading', (req, res) => {
    servePageWithScripts(path.join(__dirname, '../frontend/reading.html'), res);
});

app.get('/cinema', (req, res) => {
    servePageWithScripts(path.join(__dirname, '../frontend/cinema.html'), res);
});

app.get('/marketplace', (req, res) => {
    servePageWithScripts(path.join(__dirname, '../frontend/marketplace.html'), res);
});

app.get('/profile', (req, res) => {
    servePageWithScripts(path.join(__dirname, '../frontend/profile.html'), res);
});

app.get('/settings', (req, res) => {
    servePageWithScripts(path.join(__dirname, '../frontend/settings.html'), res);
});

app.get('/admin', (req, res) => {
    servePageWithScripts(path.join(__dirname, '../frontend/admin.html'), res);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        botTokenConfigured: !!process.env.BOT_TOKEN,
        googleAdsInjected: true,
        telegramEnabled: true,
        traditionalSignup: true,
        login: true
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🤖 Bot Token: ${process.env.BOT_TOKEN ? 'Configured' : 'Not configured'}`);
    console.log(`📱 Telegram Web App: Enabled`);
    console.log(`💰 Google Ads: Enabled (Client: ca-pub-7111358981076444)`);
    console.log(`🔧 Traditional Signup/Login: Available at /signup and /login`);
});
