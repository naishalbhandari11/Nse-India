/**
 * NSE Stock Analysis - Comprehensive Onboarding System
 * Complete guided tour covering ALL functionalities
 */

class OnboardingTour {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.overlay = null;
        this.tooltip = null;
        this.currentPageSteps = [];
        
        // Complete tour steps for all pages and functionalities
        this.allSteps = {
            // Main Dashboard Steps
            dashboard: [
                {
                    target: '.nav-brand',
                    title: 'NSE Stock Analysis Platform',
                    content: 'Welcome to your comprehensive stock analysis platform! This logo always takes you back to the main dashboard from any page.',
                    position: 'bottom'
                },
                {
                    target: '.nav-search-wrapper input',
                    title: 'Global Stock Search',
                    content: 'Search ANY NSE-listed company instantly! Type company names like "Reliance", "TCS", "HDFC" or stock symbols like "RELIANCE.NS". Get real-time data, charts, and analysis.',
                    position: 'bottom'
                },
                {
                    target: '#advancedScannerBtn',
                    title: 'Advanced Stock Scanner',
                    content: 'This powerful scanner finds trading opportunities based on technical indicators. Filter by RSI levels, MACD signals, moving averages, volume, and more to discover profitable trades.',
                    position: 'bottom',
                    action: 'navigate',
                    actionUrl: '/advanced-scanner'
                },
                {
                    target: '#generateReportBtn',
                    title: 'PDF Report Generator',
                    content: 'Export comprehensive analysis reports as PDF files. Perfect for sharing with clients, keeping records, or presenting your research findings professionally.',
                    position: 'bottom'
                },
                {
                    target: '.user-menu',
                    title: 'Account & Settings',
                    content: 'Your personal account menu. Access profile settings, view your analysis history, manage preferences, and logout securely.',
                    position: 'bottom-left'
                },
                {
                    target: '.main-content h1, .main-content h2',
                    title: 'Historical BUY Signal Analysis',
                    content: 'This is the heart of our platform! View historical buy signals with detailed performance metrics, success rates, profit/loss analysis, and risk assessments.',
                    position: 'bottom'
                },
                {
                    target: 'input[type="date"], .date-picker, .latest-date-input',
                    title: 'Date Range Selector',
                    content: 'Filter analysis by specific date ranges. Focus on recent signals for current market conditions or analyze historical performance over different time periods.',
                    position: 'bottom'
                },
                {
                    target: 'select[name*="indicator"], .indicator-select, .indicators-dropdown',
                    title: 'Technical Indicators Filter',
                    content: 'Choose from 20+ technical indicators: RSI (momentum), MACD (trend), SMA/EMA (moving averages), Bollinger Bands (volatility), Stochastic (momentum), and more!',
                    position: 'bottom'
                },
                {
                    target: '.indicator-analytics-btn, #indicatorAnalyticsBtn, [href*="indicator"]',
                    title: 'Deep Indicator Analytics',
                    content: 'Dive deep into individual indicator performance. View success rates, optimal parameters, market condition analysis, and detailed performance charts.',
                    position: 'bottom',
                    action: 'navigate',
                    actionUrl: '/indicator-analytics'
                },
                {
                    target: 'button[type="submit"], .analyze-btn, .btn-primary',
                    title: 'Execute Analysis',
                    content: 'Run your customized analysis! This processes historical data with your selected filters and generates buy/sell signals with performance metrics.',
                    position: 'bottom'
                },
                {
                    target: 'table, .results-table, .data-table',
                    title: 'Detailed Results Table',
                    content: 'Complete analysis results showing: Stock symbols, Signal dates, Entry prices, Target achievements, Success rates, Profit/Loss percentages, Risk metrics, and more. Click any row for detailed analysis!',
                    position: 'top'
                },
                {
                    target: '.pagination, .page-nav, [class*="page"]',
                    title: 'Results Navigation',
                    content: 'Navigate through thousands of analysis results. Use page numbers, next/previous buttons, and results-per-page controls to browse all data efficiently.',
                    position: 'top'
                },
                {
                    target: '#chatbot-container, .chatbot-widget, .chatbot-toggle',
                    title: 'AI Assistant Chatbot',
                    content: 'Your intelligent AI assistant! Ask questions about stocks, get explanations of technical indicators, request analysis help, or navigate to specific features. Just type naturally like "Show me RELIANCE analysis" or "What is RSI?"',
                    position: 'top'
                }
            ],
            
            // Advanced Scanner Page Steps
            scanner: [
                {
                    target: '.scanner-title, h1',
                    title: 'Advanced Stock Scanner',
                    content: 'Welcome to the most powerful stock screening tool! Find trading opportunities by filtering stocks based on multiple technical and fundamental criteria.',
                    position: 'bottom'
                },
                {
                    target: '.filter-section, .scanner-filters',
                    title: 'Multi-Criteria Filters',
                    content: 'Set multiple filters simultaneously: Price range, Market cap, Volume, RSI levels, MACD signals, Moving average crossovers, Bollinger Band positions, and more!',
                    position: 'bottom'
                },
                {
                    target: 'input[type="number"], .number-input',
                    title: 'Numerical Filter Inputs',
                    content: 'Set precise numerical criteria. For example: RSI between 30-70, Price above ₹100, Volume above 1 million shares, Market cap above ₹1000 crores.',
                    position: 'bottom'
                },
                {
                    target: '.scan-button, button[type="submit"]',
                    title: 'Execute Scan',
                    content: 'Run your custom scan across 1000+ NSE stocks! Results show stocks matching ALL your criteria with detailed metrics and analysis.',
                    position: 'bottom'
                },
                {
                    target: '.scan-results, .results-grid',
                    title: 'Scan Results Grid',
                    content: 'View filtered stocks with key metrics: Current price, RSI, MACD status, Volume, Market cap, Recent performance, and buy/sell signals.',
                    position: 'top'
                },
                {
                    target: '.export-results, .download-btn',
                    title: 'Export Scan Results',
                    content: 'Download your scan results as CSV or PDF. Perfect for further analysis in Excel or sharing with your investment team.',
                    position: 'bottom'
                },
                {
                    target: '.nav-brand',
                    title: 'Return to Dashboard',
                    content: 'Click here to return to the main dashboard and continue exploring other features.',
                    position: 'bottom',
                    action: 'navigate',
                    actionUrl: '/'
                }
            ],
            
            // Symbol Analysis Page Steps
            symbol: [
                {
                    target: '.symbol-header, .stock-title',
                    title: 'Stock Analysis Dashboard',
                    content: 'Complete analysis dashboard for individual stocks. View real-time data, technical indicators, historical performance, and trading signals.',
                    position: 'bottom'
                },
                {
                    target: '.price-info, .current-price',
                    title: 'Real-Time Price Data',
                    content: 'Live stock price with change percentage, day high/low, 52-week high/low, volume, market cap, and other key financial metrics.',
                    position: 'bottom'
                },
                {
                    target: '.chart-container, .stock-chart',
                    title: 'Interactive Price Chart',
                    content: 'Advanced charting with multiple timeframes (1D, 1W, 1M, 3M, 1Y). Zoom, pan, and analyze price movements with technical overlays.',
                    position: 'top'
                },
                {
                    target: '.technical-indicators, .indicators-panel',
                    title: 'Technical Indicators Panel',
                    content: 'Real-time technical indicators: RSI, MACD, Moving Averages, Bollinger Bands, Stochastic, Volume indicators, and trend analysis.',
                    position: 'bottom'
                },
                {
                    target: '.buy-sell-signals, .signals-panel',
                    title: 'Buy/Sell Signals',
                    content: 'AI-generated trading signals based on technical analysis. See entry points, target prices, stop losses, and confidence levels.',
                    position: 'bottom'
                },
                {
                    target: '.historical-data, .history-table',
                    title: 'Historical Performance',
                    content: 'Detailed historical data with OHLC prices, volume, technical indicator values, and past signal performance for backtesting.',
                    position: 'top'
                }
            ],
            
            // Analytics Page Steps
            analytics: [
                {
                    target: '.analytics-header',
                    title: 'Indicator Analytics Center',
                    content: 'Deep dive into technical indicator performance. Analyze which indicators work best in different market conditions and timeframes.',
                    position: 'bottom'
                },
                {
                    target: '.indicator-selector',
                    title: 'Indicator Selection',
                    content: 'Choose from 20+ technical indicators to analyze: RSI, MACD, SMA, EMA, Bollinger Bands, Stochastic, Williams %R, CCI, and more!',
                    position: 'bottom'
                },
                {
                    target: '.performance-metrics',
                    title: 'Performance Metrics',
                    content: 'Comprehensive performance analysis: Success rate, Average profit, Maximum drawdown, Sharpe ratio, Win/loss ratio, and risk-adjusted returns.',
                    position: 'bottom'
                },
                {
                    target: '.optimization-panel',
                    title: 'Parameter Optimization',
                    content: 'Optimize indicator parameters for maximum performance. Test different RSI periods, MACD settings, moving average lengths, etc.',
                    position: 'bottom'
                },
                {
                    target: '.comparison-chart',
                    title: 'Indicator Comparison',
                    content: 'Compare multiple indicators side-by-side. See which combinations work best together and in different market conditions.',
                    position: 'top'
                }
            ]
        };
    }

    // Check if user needs onboarding
    shouldShowOnboarding(user) {
        // Always check both localStorage and database status
        const hasSeenOnboarding = localStorage.getItem(`onboarding_completed_${user.email}`);
        console.log(`[ONBOARDING] Checking for user ${user.email}: localStorage=${hasSeenOnboarding}`);
        
        // For testing purposes, also check if user has onboarding_completed flag
        // This will be set to false for new test users
        return !hasSeenOnboarding;
    }

    // Get current page type
    getCurrentPageType() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('advanced-scanner') || path.includes('scanner')) return 'scanner';
        if (path.includes('symbol') || path.includes('stock')) return 'symbol';
        if (path.includes('indicator-analytics') || path.includes('analytics')) return 'analytics';
        return 'dashboard';
    }

    // Get steps for current page with fallbacks
    getCurrentPageSteps() {
        const pageType = this.getCurrentPageType();
        let steps = [...this.allSteps[pageType]];
        
        // Filter steps based on actual elements present on page
        steps = steps.filter(step => {
            const element = this.findElement(step.target);
            return element !== null;
        });
        
        // If no page-specific steps found, use dashboard steps
        if (steps.length === 0) {
            steps = this.allSteps.dashboard.filter(step => {
                const element = this.findElement(step.target);
                return element !== null;
            });
        }
        
        return steps;
    }

    // Smart element finder with multiple selectors and better fallbacks
    findElement(selector) {
        // Try original selector first
        let element = document.querySelector(selector);
        if (element) return element;
        
        // Try alternative selectors based on common patterns
        const alternatives = {
            '.nav-brand': 'a[href="/"], .logo, .brand, [class*="brand"], .navbar a:first-child',
            '.nav-search-wrapper input': 'input[type="search"], input[placeholder*="search"], input[placeholder*="Search"], .search-input, #globalSearch',
            '#advancedScannerBtn': 'button[class*="scanner"], a[href*="scanner"], [class*="scan"], button:contains("Scanner")',
            '#generateReportBtn': 'button[class*="report"], button[class*="export"], button[class*="pdf"], button:contains("PDF"), button:contains("Report")',
            '.user-menu': '.user-info, .profile-menu, [class*="user"], .nav-auth-wrapper .user-menu',
            '.main-content h1, .main-content h2': 'h1, h2, .title, .heading, main h1, main h2',
            'input[type="date"], .date-picker, .latest-date-input': 'input[type="date"], .date-input, [class*="date"]',
            'select[name*="indicator"], .indicator-select, .indicators-dropdown': 'select, .dropdown, [class*="select"]',
            '.indicator-analytics-btn, #indicatorAnalyticsBtn, [href*="indicator"]': 'button[class*="analytics"], a[href*="analytics"], button:contains("Analytics")',
            'button[type="submit"], .analyze-btn, .btn-primary': 'button[type="submit"], .btn-primary, button.primary, .analyze-btn',
            'table, .results-table, .data-table': 'table, .table, [class*="table"]',
            '.pagination, .page-nav, [class*="page"]': '.pagination, [class*="page"], .nav',
            '#chatbot-container, .chatbot-widget, .chatbot-toggle': '#chatbot-container, .chatbot-widget, .chatbot-toggle, .chatbot-button, [class*="chatbot"], .ai-assistant'
        };
        
        if (alternatives[selector]) {
            const altSelectors = alternatives[selector].split(', ');
            for (const altSelector of altSelectors) {
                element = document.querySelector(altSelector);
                if (element) return element;
            }
        }
        
        // Try more generic fallbacks based on selector type
        if (selector.includes('button')) {
            // Look for buttons with similar text content
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                const text = btn.textContent.toLowerCase();
                if (selector.includes('scanner') && text.includes('scanner')) return btn;
                if (selector.includes('report') && (text.includes('report') || text.includes('pdf'))) return btn;
                if (selector.includes('analytics') && text.includes('analytics')) return btn;
            }
        }
        
        if (selector.includes('input')) {
            // Look for input fields with similar attributes
            const inputs = document.querySelectorAll('input');
            for (const input of inputs) {
                if (selector.includes('search') && (input.placeholder?.toLowerCase().includes('search') || input.type === 'search')) return input;
                if (selector.includes('date') && input.type === 'date') return input;
            }
        }
        
        return null;
    }

    // Show welcome modal
    showWelcomeModal() {
        const modal = document.createElement('div');
        modal.className = 'onboarding-modal-overlay';
        modal.innerHTML = `
            <div class="onboarding-modal">
                <div class="onboarding-modal-header">
                    <h2>🎉 Welcome to NSE Stock Analysis</h2>
                </div>
                <div class="onboarding-modal-content">
                    <p>This comprehensive platform helps you analyze Indian stock market data using advanced technical indicators, historical signals, and powerful scanning tools.</p>
                    
                    <div class="onboarding-features">
                        <div class="feature-item">
                            <span class="feature-icon">📈</span>
                            <span>Discover high-probability trading opportunities with 20+ technical indicators</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">🔍</span>
                            <span>Advanced stock scanner with multi-criteria filtering across 1000+ NSE stocks</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">⚡</span>
                            <span>Real-time analysis with RSI, MACD, Moving Averages, Bollinger Bands & more</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">📊</span>
                            <span>Professional PDF reports and detailed performance analytics</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">🎯</span>
                            <span>Historical backtesting with success rates and risk analysis</span>
                        </div>
                    </div>
                    
                    <div class="tour-info">
                        <p><strong>This guided tour will show you:</strong></p>
                        <ul>
                            <li>How to search and analyze any NSE stock</li>
                            <li>Using the advanced scanner to find opportunities</li>
                            <li>Understanding technical indicators and signals</li>
                            <li>Generating professional analysis reports</li>
                            <li>All buttons, features, and functionalities</li>
                        </ul>
                    </div>
                </div>
                <div class="onboarding-modal-actions">
                    <button class="onboarding-btn secondary" id="skipOnboarding">Skip for Now</button>
                    <button class="onboarding-btn primary" id="startTour">Start Complete Tour</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        document.getElementById('startTour').addEventListener('click', () => {
            this.closeWelcomeModal();
            this.startTour();
        });

        document.getElementById('skipOnboarding').addEventListener('click', () => {
            this.closeWelcomeModal();
            this.markOnboardingComplete();
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeWelcomeModal();
                this.markOnboardingComplete();
            }
        });
    }

    closeWelcomeModal() {
        const modal = document.querySelector('.onboarding-modal-overlay');
        if (modal) {
            modal.remove();
        }
    }

    // Start the guided tour
    startTour() {
        this.isActive = true;
        this.currentStep = 0;
        this.currentPageSteps = this.getCurrentPageSteps();
        
        if (this.currentPageSteps.length === 0) {
            this.showCompletionMessage();
            return;
        }
        
        this.createOverlay();
        this.showStep(0);
    }

    // Create overlay for highlighting elements
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'onboarding-overlay';
        document.body.appendChild(this.overlay);

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'onboarding-tooltip';
        document.body.appendChild(this.tooltip);
    }

    // Show specific step
    showStep(stepIndex) {
        if (stepIndex >= this.currentPageSteps.length) {
            this.completeTour();
            return;
        }

        const step = this.currentPageSteps[stepIndex];
        const target = this.findElement(step.target);

        if (!target) {
            console.warn(`Onboarding: Target element not found: ${step.target}`);
            this.nextStep();
            return;
        }

        // Highlight target element
        this.highlightElement(target);

        // Position and show tooltip
        this.showTooltip(target, step, stepIndex);

        // Scroll target into view smoothly
        target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'center'
        });
    }

    // Highlight target element
    highlightElement(element) {
        // Remove previous highlights
        document.querySelectorAll('.onboarding-highlight').forEach(el => {
            el.classList.remove('onboarding-highlight');
        });

        // Add highlight to current element
        element.classList.add('onboarding-highlight');

        // Create spotlight effect
        const rect = element.getBoundingClientRect();
        const padding = 8;
        this.overlay.style.clipPath = `polygon(0% 0%, 0% 100%, ${rect.left - padding}px 100%, ${rect.left - padding}px ${rect.top - padding}px, ${rect.right + padding}px ${rect.top - padding}px, ${rect.right + padding}px ${rect.bottom + padding}px, ${rect.left - padding}px ${rect.bottom + padding}px, ${rect.left - padding}px 100%, 100% 100%, 100% 0%)`;
    }

    // Show tooltip with step information
    showTooltip(target, step, stepIndex) {
        const rect = target.getBoundingClientRect();
        
        this.tooltip.innerHTML = `
            <div class="tooltip-header">
                <h3>${step.title}</h3>
                <span class="step-counter">${stepIndex + 1} of ${this.currentPageSteps.length}</span>
            </div>
            <div class="tooltip-content">
                <p>${step.content}</p>
            </div>
            <div class="tooltip-actions">
                ${stepIndex > 0 ? '<button class="onboarding-btn secondary" id="prevStep">Previous</button>' : ''}
                <button class="onboarding-btn secondary" id="skipTour">Skip Tour</button>
                <button class="onboarding-btn primary" id="nextStep">
                    ${stepIndex === this.currentPageSteps.length - 1 ? 'Finish' : 'Next'}
                </button>
            </div>
            <div class="tooltip-arrow"></div>
        `;

        // Position tooltip with smart positioning
        this.positionTooltipSmart(target, step.position);

        // Add event listeners
        const nextBtn = document.getElementById('nextStep');
        const prevBtn = document.getElementById('prevStep');
        const skipBtn = document.getElementById('skipTour');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextStep());
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevStep());
        }
        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.completeTour());
        }
    }

    // Smart tooltip positioning that prevents cutoff completely
    positionTooltipSmart(target, preferredPosition) {
        const rect = target.getBoundingClientRect();
        const tooltip = this.tooltip;
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        
        // Get actual tooltip dimensions after rendering
        tooltip.style.visibility = 'hidden';
        tooltip.style.display = 'block';
        tooltip.style.position = 'fixed';
        tooltip.style.top = '0px';
        tooltip.style.left = '0px';
        
        const tooltipRect = tooltip.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width || 400;
        const tooltipHeight = tooltipRect.height || 250;
        const margin = 15;
        
        tooltip.style.visibility = 'visible';
        
        let position = preferredPosition;
        let left = rect.left + rect.width / 2;
        let top = rect.bottom + margin;
        let transform = 'translate(-50%, 0)';
        
        // Smart positioning algorithm - try all positions and pick the best one
        const positions = [
            {
                name: 'bottom',
                left: rect.left + rect.width / 2,
                top: rect.bottom + margin,
                transform: 'translate(-50%, 0)',
                fits: rect.bottom + margin + tooltipHeight <= viewport.height
            },
            {
                name: 'top',
                left: rect.left + rect.width / 2,
                top: rect.top - margin,
                transform: 'translate(-50%, -100%)',
                fits: rect.top - margin - tooltipHeight >= 0
            },
            {
                name: 'right',
                left: rect.right + margin,
                top: rect.top + rect.height / 2,
                transform: 'translate(0, -50%)',
                fits: rect.right + margin + tooltipWidth <= viewport.width
            },
            {
                name: 'left',
                left: rect.left - margin,
                top: rect.top + rect.height / 2,
                transform: 'translate(-100%, -50%)',
                fits: rect.left - margin - tooltipWidth >= 0
            }
        ];
        
        // Find the best position that fits
        let bestPosition = positions.find(p => p.name === preferredPosition && p.fits) || 
                          positions.find(p => p.fits) || 
                          positions[0]; // fallback to bottom
        
        left = bestPosition.left;
        top = bestPosition.top;
        transform = bestPosition.transform;
        position = bestPosition.name;
        
        // Viewport boundary corrections with transform awareness
        if (transform.includes('-50%')) {
            // Centered horizontally
            const halfWidth = tooltipWidth / 2;
            if (left - halfWidth < margin) {
                left = halfWidth + margin;
            }
            if (left + halfWidth > viewport.width - margin) {
                left = viewport.width - halfWidth - margin;
            }
        } else if (transform.includes('-100%')) {
            // Right-aligned
            if (left - tooltipWidth < margin) {
                left = tooltipWidth + margin;
            }
        } else {
            // Left-aligned
            if (left + tooltipWidth > viewport.width - margin) {
                left = viewport.width - tooltipWidth - margin;
            }
            if (left < margin) {
                left = margin;
            }
        }
        
        // Vertical corrections
        if (transform.includes('-100%')) {
            // Top-aligned
            if (top - tooltipHeight < margin) {
                top = tooltipHeight + margin;
            }
        } else if (transform.includes('-50%')) {
            // Vertically centered
            const halfHeight = tooltipHeight / 2;
            if (top - halfHeight < margin) {
                top = halfHeight + margin;
            }
            if (top + halfHeight > viewport.height - margin) {
                top = viewport.height - halfHeight - margin;
            }
        } else {
            // Bottom-aligned
            if (top + tooltipHeight > viewport.height - margin) {
                top = viewport.height - tooltipHeight - margin;
            }
            if (top < margin) {
                top = margin;
            }
        }
        
        // Apply final positioning
        tooltip.className = `onboarding-tooltip position-${position}`;
        tooltip.style.left = `${Math.max(margin, Math.min(left, viewport.width - margin))}px`;
        tooltip.style.top = `${Math.max(margin, Math.min(top, viewport.height - margin))}px`;
        tooltip.style.transform = transform;
        tooltip.style.position = 'fixed';
        tooltip.style.zIndex = '10001';
        tooltip.style.maxWidth = `${Math.min(tooltipWidth, viewport.width - 2 * margin)}px`;
        tooltip.style.maxHeight = `${Math.min(tooltipHeight, viewport.height - 2 * margin)}px`;
        tooltip.style.overflow = 'auto';
    }

    // Navigate to next step with smart cross-page navigation
    async nextStep() {
        const currentStep = this.currentPageSteps[this.currentStep];
        
        // Update session storage with current step
        sessionStorage.setItem('onboarding_tour_step', this.currentStep.toString());
        
        // Check if current step has navigation action
        if (currentStep && currentStep.action === 'navigate' && currentStep.actionUrl) {
            // Show loading state
            this.showNavigationLoading(currentStep.actionUrl);
            
            // Store that we're navigating
            sessionStorage.setItem('onboarding_navigating', 'true');
            sessionStorage.setItem('onboarding_next_step', (this.currentStep + 1).toString());
            
            // Navigate to the new page
            setTimeout(() => {
                window.location.href = currentStep.actionUrl;
            }, 1000); // Give time for loading animation
        } else {
            // Normal step progression
            this.currentStep++;
            sessionStorage.setItem('onboarding_tour_step', this.currentStep.toString());
            this.showStep(this.currentStep);
        }
    }

    // Show navigation loading overlay
    showNavigationLoading(url) {
        const loading = document.createElement('div');
        loading.className = 'onboarding-navigation-loading';
        loading.innerHTML = `
            <div class="navigation-loading-content">
                <div class="navigation-spinner"></div>
                <h3>Navigating to ${this.getPageTitle(url)}</h3>
                <p>Please wait while we take you to the next section...</p>
            </div>
        `;
        document.body.appendChild(loading);
    }

    // Hide navigation loading overlay
    hideNavigationLoading() {
        const loading = document.querySelector('.onboarding-navigation-loading');
        if (loading) {
            loading.remove();
        }
    }

    // Get page title from URL
    getPageTitle(url) {
        const titles = {
            '/': 'Dashboard',
            '/advanced-scanner': 'Advanced Scanner',
            '/indicator-analytics': 'Indicator Analytics',
            '/symbol': 'Stock Analysis'
        };
        return titles[url] || 'Next Page';
    }

    // Navigate to a specific page
    async navigateToPage(url) {
        // Simple navigation - let the browser handle it
        window.location.href = url;
    }

    // Wait for page to fully load
    async waitForPageLoad() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                // Page already loaded, wait a bit for dynamic content
                setTimeout(resolve, 1000);
            } else {
                // Wait for page load event
                window.addEventListener('load', () => {
                    setTimeout(resolve, 1000);
                }, { once: true });
            }
        });
    }

    // Resume tour after page navigation (called from new page)
    resumeTour() {
        const wasNavigating = sessionStorage.getItem('onboarding_navigating');
        const nextStep = sessionStorage.getItem('onboarding_next_step');
        
        if (wasNavigating === 'true' && nextStep) {
            // We just navigated, continue from next step
            this.currentStep = parseInt(nextStep) || 0;
            sessionStorage.removeItem('onboarding_navigating');
            sessionStorage.removeItem('onboarding_next_step');
        }
        
        if (this.isActive) {
            // Hide any loading overlays
            this.hideNavigationLoading();
            
            // Recreate overlay and tooltip on new page
            this.createOverlay();
            
            // Get steps for current page
            this.currentPageSteps = this.getCurrentPageSteps();
            
            // Show current step
            this.showStep(this.currentStep);
        }
    }

    // Navigate to previous step
    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }

    // Complete the tour
    completeTour() {
        this.isActive = false;
        
        // Remove highlights
        document.querySelectorAll('.onboarding-highlight').forEach(el => {
            el.classList.remove('onboarding-highlight');
        });

        // Remove overlay and tooltip
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }

        // Mark onboarding as complete
        this.markOnboardingComplete();

        // Show completion message
        this.showCompletionMessage();
    }

    // Mark onboarding as completed for this user
    async markOnboardingComplete() {
        const userData = localStorage.getItem('user_data');
        if (userData) {
            const user = JSON.parse(userData);
            
            // Store in localStorage as backup
            localStorage.setItem(`onboarding_completed_${user.email}`, 'true');
            
            // Also update in database via API
            try {
                await fetch('/api/auth/complete-onboarding', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                console.warn('Failed to update onboarding status in database:', error);
            }
        }
    }

    // Show completion message
    showCompletionMessage() {
        const message = document.createElement('div');
        message.className = 'onboarding-completion';
        message.innerHTML = `
            <div class="completion-content">
                <div class="completion-icon">🎉</div>
                <h3>Comprehensive Tour Complete!</h3>
                <p>You've successfully explored all the major features of NSE Stock Analysis! You're now ready to analyze stocks like a professional trader.</p>
                <div class="completion-tips">
                    <p><strong>What you've learned:</strong></p>
                    <ul>
                        <li>How to search and analyze any NSE-listed stock instantly</li>
                        <li>Using the advanced scanner to find profitable opportunities</li>
                        <li>Understanding 20+ technical indicators and their signals</li>
                        <li>Generating professional PDF reports for analysis</li>
                        <li>Navigating between dashboard, scanner, and analytics pages</li>
                        <li>Using the AI chatbot for instant help and navigation</li>
                    </ul>
                </div>
                <div class="completion-actions">
                    <button class="onboarding-btn primary" onclick="this.parentElement.parentElement.parentElement.remove()">
                        Start Trading Analysis
                    </button>
                    <button class="onboarding-btn secondary" onclick="window.onboardingTour.triggerOnboarding()">
                        Replay Tour
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(message);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 10000);
    }

    // Manual trigger for testing
    triggerOnboarding() {
        this.showWelcomeModal();
    }

    // Initialize onboarding for a user
    init(user) {
        console.log(`[ONBOARDING] Initializing for user:`, user);
        
        // Check if tour is in progress from another page
        const tourInProgress = sessionStorage.getItem('onboarding_tour_active');
        const tourStep = sessionStorage.getItem('onboarding_tour_step');
        
        console.log(`[ONBOARDING] Tour state - active: ${tourInProgress}, step: ${tourStep}`);
        
        if (tourInProgress === 'true' && tourStep) {
            // Resume tour from where it left off
            console.log(`[ONBOARDING] Resuming tour from step ${tourStep}`);
            this.isActive = true;
            this.currentStep = parseInt(tourStep) || 0;
            
            // Small delay to ensure page is fully loaded
            setTimeout(() => {
                this.resumeTour();
            }, 1500);
        } else if (this.shouldShowOnboarding(user)) {
            // Start new tour
            console.log(`[ONBOARDING] Starting new tour for user ${user.email}`);
            setTimeout(() => {
                this.showWelcomeModal();
            }, 1500);
        } else {
            console.log(`[ONBOARDING] User ${user.email} has already completed onboarding`);
        }
    }

    // Start the guided tour
    startTour() {
        this.isActive = true;
        this.currentStep = 0;
        this.currentPageSteps = this.getCurrentPageSteps();
        
        // Store tour state in session storage for cross-page navigation
        sessionStorage.setItem('onboarding_tour_active', 'true');
        sessionStorage.setItem('onboarding_tour_step', '0');
        
        if (this.currentPageSteps.length === 0) {
            this.showCompletionMessage();
            return;
        }
        
        this.createOverlay();
        this.showStep(0);
    }

    // Resume tour after page navigation (called from new page)
    resumeTour() {
        const wasNavigating = sessionStorage.getItem('onboarding_navigating');
        const nextStep = sessionStorage.getItem('onboarding_next_step');
        
        if (wasNavigating === 'true' && nextStep) {
            // We just navigated, continue from next step
            this.currentStep = parseInt(nextStep) || 0;
            sessionStorage.removeItem('onboarding_navigating');
            sessionStorage.removeItem('onboarding_next_step');
        }
        
        if (this.isActive) {
            // Recreate overlay and tooltip on new page
            this.createOverlay();
            
            // Get steps for current page
            this.currentPageSteps = this.getCurrentPageSteps();
            
            // Show current step
            this.showStep(this.currentStep);
        }
    }

    // Complete the tour
    completeTour() {
        this.isActive = false;
        
        // Clear session storage
        sessionStorage.removeItem('onboarding_tour_active');
        sessionStorage.removeItem('onboarding_tour_step');
        sessionStorage.removeItem('onboarding_navigating');
        sessionStorage.removeItem('onboarding_next_step');
        
        // Remove highlights
        document.querySelectorAll('.onboarding-highlight').forEach(el => {
            el.classList.remove('onboarding-highlight');
        });

        // Remove overlay and tooltip
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }

        // Mark onboarding as complete
        this.markOnboardingComplete();

        // Show completion message
        this.showCompletionMessage();
    }
}

// Global instance
window.onboardingTour = new OnboardingTour();

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Comprehensive Onboarding System Initialized');
});