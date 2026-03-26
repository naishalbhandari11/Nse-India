// FAST SCANNER - Loads all results at once with caching
let allScanResults = [];
let currentScanPage = 1;
let SCAN_ITEMS_PER_PAGE = 100; // Default 100 per page
let currentScanParams = {};
let isGroupedView = false;
let currentSearchTerm = '';
let currentSortBy = 'success'; // Default to highest success rate
let currentSortDir = 'desc'; // Default direction
let displayRenderGen = 0; // Incremented each render; enrichment callbacks check this to avoid stale updates
let minSuccessFilter = 0; // Min success % filter (0 = no filter)

// GLOBALLY ACCESSIBLE FUNCTIONS
function handleDropdownSort(sortBy, direction) {
    if (!direction) return;
    console.log(`🔽 [DROPDOWN SORT] ${sortBy} -> ${direction}`);
    
    // Reset other dropdown
    if (sortBy === 'success') {
        const profitSelect = document.getElementById('sortProfit');
        if (profitSelect) profitSelect.value = '';
    } else if (sortBy === 'netProfit') {
        const successSelect = document.getElementById('sortSuccess');
        if (successSelect) successSelect.value = '';
    }
    
    currentSortBy = sortBy;
    currentSortDir = direction;
    currentScanPage = 1;
    
    if (allScanResults.length > 0) {
        displayScanResults(allScanResults, false);
    }
}

// Ensure globally accessible immediately
window.handleDropdownSort = handleDropdownSort;

// Cache management
let cachedScanData = null;
let cacheTimestamp = null;
const CACHE_TTL = 86400000; // 24 hours (matches server cache)

// Log cache status on load
console.log('🚀 [SCANNER] Fast scanner initialized');
console.log(`⏱️  [SCANNER] Cache TTL: ${CACHE_TTL / 1000}s`);

// Declare functions that will be used globally
function changeScanPage(page) {
    console.log(`📄 [PAGINATION] Changing to page ${page}`);
    const totalPages = Math.ceil(allScanResults.length / SCAN_ITEMS_PER_PAGE);
    if (page < 1 || page > totalPages) {
        console.log(`⚠️  [PAGINATION] Invalid page ${page}, valid range: 1-${totalPages}`);
        return;
    }

    currentScanPage = page;
    displayScanResults(allScanResults, false);

    // Scroll to top of results
    document.getElementById('scannerResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Make function globally accessible immediately
window.changeScanPage = changeScanPage;

function changeScanSort(sortBy) {
    console.log(`🔃 [SORT] Changing sort for: ${sortBy}`);
    
    if (currentSortBy === sortBy) {
        // Toggle direction if same column
        currentSortDir = currentSortDir === 'desc' ? 'asc' : 'desc';
        console.log(`↕️ [SORT] Toggled direction to: ${currentSortDir}`);
    } else {
        // Switch to new column, default to desc
        currentSortBy = sortBy;
        currentSortDir = 'desc';
        console.log(`➡️ [SORT] New sort column: ${sortBy} (desc)`);
    }
    
    currentScanPage = 1; // Reset to page 1 for new sort
    if (allScanResults.length > 0) {
        displayScanResults(allScanResults, false);
    }
}

function updateSortArrows() {
    // Arrows removed as per user request
}

window.changeScanSort = changeScanSort;

// function handleDropdownSort moved to top

// Verify it's accessible
console.log('✅ [SCANNER] changeScanPage function is globally accessible:', typeof window.changeScanPage);

async function performScanFast() {
    const target = document.getElementById('scannerTarget').value;
    const stopLoss = document.getElementById('scannerStopLoss').value;
    const holdingDays = document.getElementById('holdingDays').value || '30';
    const fromDate = document.getElementById('scannerFromDate').value || '';
    const toDate = document.getElementById('scannerToDate').value || '';

    // Read selected indicators from multi-select pill UI
    const selectedIndicators = getSelectedIndicators();
    // If none selected or all selected → send ALL (single scan, fastest)
    const allIndicators = ['SMA5','SMA10','SMA20','SMA50','SMA100','SMA200',
        'RSI7','RSI14','RSI21','RSI50','RSI80',
        'BB10_Lower','BB20_Lower','BB50_Lower','BB100_Lower',
        'Short','Long','Standard',
        'STOCH5','STOCH9','STOCH14','STOCH21','STOCH50'];
    const indicator = (selectedIndicators.length === 0 || selectedIndicators.length === allIndicators.length)
        ? 'ALL'
        : selectedIndicators.join(',');

    if (!target || !stopLoss || !holdingDays) {
        showNotification('Please fill all required fields', 'warning');
        return;
    }

    // Store current parameters
    currentScanParams = { target, stopLoss, holdingDays, fromDate, toDate, indicator };

    // Create cache key that matches server-side cache key format
    const cacheKey = `v2_${target}_${stopLoss}_${holdingDays}_${fromDate}_${toDate}_${indicator}`;
    const now = Date.now();

    // Check if we have cached data with same parameters
    if (cachedScanData && cachedScanData.cacheKey === cacheKey &&
        cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
        console.log('📦 [SCANNER] Using client-side cached data');
        allScanResults = cachedScanData.results;
        currentScanPage = 1; // Reset to page 1 for cached results
        displayScanResults(allScanResults, true);
        showNotification(`Found ${allScanResults.length} companies (from client cache)`, 'success');
        return;
    }

    // If cache miss or expired, clear old cache
    if (cachedScanData && cachedScanData.cacheKey !== cacheKey) {
        console.log('🔄 [SCANNER] Parameters changed, clearing old cache');
        cachedScanData = null;
        cacheTimestamp = null;
    }

    // Show loading
    document.getElementById('scannerLoading').style.display = 'block';
    document.getElementById('scannerResults').style.display = 'none';

    // Update loading message with indicator info
    const loadingProgress = document.getElementById('scanProgress');
    if (loadingProgress) {
        if (indicator === 'ALL') {
            loadingProgress.textContent = 'Analyzing BUY signals across all indicators...';
        } else {
            loadingProgress.textContent = `Analyzing ${indicator} BUY signals...`;
        }
    }

    // Show elapsed time counter so user knows it's working
    let elapsedSeconds = 0;
    const timerEl = document.getElementById('scanProgressTimer');
    const timerInterval = setInterval(() => {
        elapsedSeconds++;
        if (timerEl) timerEl.textContent = `(${elapsedSeconds}s elapsed — first run may take 1-2 min, results are cached after)`;
    }, 1000);

    try {
        // Use latest_only=true for fast symbol list, date range applied during analysis
        const url = `/api/day-trading-scan?target=${target}&stop_loss=${stopLoss}&holding_days=${holdingDays}&from_date=${fromDate}&to_date=${toDate}&indicator=${indicator}&latest_only=true`;
        console.log('🔍 [SCANNER] Fetching:', url);
        console.log('🔑 [SCANNER] Cache key:', cacheKey);

        const startTime = performance.now();
        const response = await fetch(url);
        const data = await response.json();
        const endTime = performance.now();
        const loadTime = ((endTime - startTime) / 1000).toFixed(2);

        if (data.error) {
            clearInterval(timerInterval);
            showNotification('Scan failed: ' + data.error, 'error');
            return;
        }

        allScanResults = data.results || [];

        // Reset to page 1 for new results
        currentScanPage = 1;

        // Cache the results with the correct key
        cachedScanData = {
            cacheKey: cacheKey,
            results: allScanResults,
            timestamp: now
        };
        cacheTimestamp = now;

        clearInterval(timerInterval);
        console.log(`✅ [SCANNER] Loaded ${allScanResults.length} results in ${loadTime}s`);
        console.log(`💾 [SCANNER] Cached with key: ${cacheKey}`);

        displayScanResults(allScanResults, data.cached);

        // Show appropriate notification
        if (data.cached) {
            showNotification(`Found ${allScanResults.length} companies in ${loadTime}s (server cache)`, 'success');
        } else {
            showNotification(`Found ${allScanResults.length} companies in ${loadTime}s`, 'success');
        }

    } catch (error) {
        clearInterval(timerInterval);
        console.error('❌ [SCANNER] Error:', error);
        showNotification('Scan failed: ' + error.message, 'error');
    } finally {
        document.getElementById('scannerLoading').style.display = 'none';
        if (timerEl) timerEl.textContent = '';
    }
}

async function displayScanResults(results, isCached = false) {
    // Bump render generation so any in-flight enrichment from a previous render is ignored
    const myGen = ++displayRenderGen;

    document.getElementById('scannerResults').style.display = 'block';

    // Apply search filter first
    let filteredResults = applySearchFilter(results);

    // Apply grouping if enabled
    if (isGroupedView) {
        filteredResults = groupResultsByCompany(filteredResults);
    }

    // Apply current sort
    filteredResults = applyScanSort(filteredResults, currentSortBy);
    updateSortArrows();

    // Pagination
    const totalPages = Math.ceil(filteredResults.length / SCAN_ITEMS_PER_PAGE);
    const startIndex = (currentScanPage - 1) * SCAN_ITEMS_PER_PAGE;
    const endIndex = startIndex + SCAN_ITEMS_PER_PAGE;
    const paginatedResults = filteredResults.slice(startIndex, endIndex);

    const tbody = document.getElementById('resultsTableBody');
    tbody.innerHTML = '';

    if (filteredResults.length === 0) {
        const message = currentSearchTerm
            ? `No results found for "${currentSearchTerm}"`
            : 'No companies found. Try adjusting the parameters or date range.';
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 2rem;">${message}</td></tr>`;
        updatePaginationControls(0, 0);
        updateResultsBadges([]);  // clear badges when nothing matches
        return;
    }

    // Render current page immediately
    if (isGroupedView) {
        renderGroupedResults(paginatedResults, tbody, startIndex);
    } else {
        renderUngroupedResults(paginatedResults, tbody, startIndex);
    }

    updatePaginationControls(filteredResults.length, totalPages);

    // Update summary badges with simple sums across all filtered results
    updateResultsBadges(filteredResults);

    setTimeout(() => {
        document.getElementById('scannerResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // ── Enrich ALL filtered results in background batches ──────────────────
    // Each batch re-renders current page after its batch
    const BATCH = 5;
    const enrichFn = isGroupedView ? enrichGroupedStats : enrichUngroupedStats;

    for (let i = 0; i < filteredResults.length; i += BATCH) {
        if (displayRenderGen !== myGen) return; // newer render started — stop
        const batch = filteredResults.slice(i, i + BATCH);
        await enrichFn(batch);
        if (displayRenderGen !== myGen) return;

        // Re-render current page once its batch is done
        const batchEnd = i + BATCH;
        if (batchEnd > startIndex && i < endIndex) {
            tbody.innerHTML = '';
            if (isGroupedView) {
                renderGroupedResults(paginatedResults, tbody, startIndex);
            } else {
                renderUngroupedResults(paginatedResults, tbody, startIndex);
            }
        }
    }
}

function renderUngroupedResults(results, tbody, startIndex) {
    results.forEach((result, index) => {
        const globalIndex = startIndex + index + 1;
        const row = document.createElement('tr');

        // Use enriched data from /api/scanner/analyze if available, else fall back to scan data
        const totalSignals    = result._enriched_total    !== undefined ? result._enriched_total    : (result.total_signals    || 0);
        const profitSignals   = result._enriched_profit   !== undefined ? result._enriched_profit   : (result.profit_signals   || 0);
        const lossSignals     = result._enriched_loss     !== undefined ? result._enriched_loss     : (result.loss_signals     || 0);
        const soldOutSignals  = result._enriched_sold     !== undefined ? result._enriched_sold     : (result.sold_out_signals || 0);
        const openTrades      = result._enriched_open     !== undefined ? result._enriched_open     : (result.open_trades      || 0);
        const notTradedSignals= result._enriched_not_traded !== undefined ? result._enriched_not_traded : (result.not_traded_signals || 0);
        const netProfit       = result._enriched_net_profit !== undefined ? result._enriched_net_profit : (result.net_profit_loss || 0);

        // Success rate = profit / completed (exclude OPEN and NOT_TRADED)
        const completedSignals = profitSignals + lossSignals + soldOutSignals;
        const successRate = completedSignals > 0 ? (profitSignals / completedSignals * 100) : 0;

        const successClass = successRate >= 70 ? 'success-high' : successRate >= 50 ? 'success-medium' : 'success-low';
        const profitClass = netProfit >= 0 ? 'profit' : 'loss';

        const indicator = result.indicator || (result.indicators && result.indicators[0]) || '-';
        const indicatorDisplay = indicator !== '-'
            ? (indicator === 'Short' || indicator === 'Long' || indicator === 'Standard' ? `MACD_${indicator}` : indicator)
            : '-';
        const indicatorParam = indicator !== '-' ? indicator : 'RSI7';

        row.innerHTML = `
            <td>${globalIndex}</td>
            <td><strong>${result.symbol}</strong></td>
            <td class="center">${indicatorDisplay}</td>
            <td class="center">${totalSignals}</td>
            <td class="center profit">${profitSignals}</td>
            <td class="center loss">${lossSignals}</td>
            <td class="center sold">${soldOutSignals}</td>
            <td class="center">${openTrades}</td>
            <td class="center" style="color:#d32f2f">${notTradedSignals}</td>
            <td class="center"><span class="badge ${successClass}">${successRate.toFixed(1)}%</span></td>
            <td class="center ${profitClass}"><strong>${netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}%</strong></td>
            <td class="center">
                <a href="/scanner-detail/${encodeURIComponent(result.symbol)}?indicator=${encodeURIComponent(indicatorParam)}&target=${currentScanParams.target}&stop_loss=${currentScanParams.stopLoss}&days=${currentScanParams.holdingDays}&from_date=${currentScanParams.fromDate || ''}&to_date=${currentScanParams.toDate || ''}" 
                   class="btn-view" target="_blank">VIEW</a>
            </td>
        `;

        tbody.appendChild(row);
    });
}

function renderGroupedResults(groups, tbody, startIndex) {
    groups.forEach((group, index) => {
        const globalIndex = startIndex + index + 1;
        const indicatorCount = group.indicators.length;

        const totalSignals = group.total_signals || 0;
        const profitSignals = group.profit_signals || 0;
        const lossSignals = group.loss_signals || 0;
        const soldOutSignals = group.sold_out_signals || 0;
        const openTrades = group.open_trades || 0;
        const notTradedSignals = group.not_traded_signals || 0;

        // Success rate = profit / completed (exclude OPEN and NOT_TRADED)
        const completedSignals = profitSignals + lossSignals + soldOutSignals;
        const successRate = completedSignals > 0 ? (profitSignals / completedSignals * 100) : 0;

        const successClass = successRate >= 70 ? 'success-high' : successRate >= 50 ? 'success-medium' : 'success-low';
        const profitClass = group.total_net_profit >= 0 ? 'profit' : 'loss';

        // Main row with company name
        const mainRow = document.createElement('tr');
        mainRow.className = 'company-group-start';
        const matchedIndicatorsParam = group.indicators.map(ind => ind.indicator).join(',');
        
        mainRow.innerHTML = `
            <td>${globalIndex}</td>
            <td><strong>${group.symbol}</strong> <span class="indicator-count-badge">${indicatorCount} indicators</span></td>
            <td class="center">
                ${group.indicators.map(ind => `<span class="indicator-badge">${ind.indicator === 'Short' || ind.indicator === 'Long' || ind.indicator === 'Standard' ? 'MACD_' + ind.indicator : ind.indicator}</span>`).join(' ')}
            </td>
            <td class="center">${totalSignals}</td>
            <td class="center profit">${profitSignals}</td>
            <td class="center loss">${lossSignals}</td>
            <td class="center sold">${soldOutSignals}</td>
            <td class="center">${openTrades}</td>
            <td class="center" style="color:#d32f2f">${notTradedSignals}</td>
            <td class="center"><span class="badge ${successClass}">${successRate.toFixed(1)}%</span></td>
            <td class="center ${profitClass}"><strong>${group.total_net_profit >= 0 ? '+' : ''}${group.total_net_profit.toFixed(2)}%</strong></td>
            <td class="center">
                <a href="/scanner-detail/${encodeURIComponent(group.symbol)}?indicator=${encodeURIComponent(matchedIndicatorsParam)}&target=${currentScanParams.target}&stop_loss=${currentScanParams.stopLoss}&days=${currentScanParams.holdingDays}&from_date=${currentScanParams.fromDate || ''}&to_date=${currentScanParams.toDate || ''}" 
                   class="btn-view" target="_blank" title="View matching indicators for ${group.symbol}">VIEW ALL</a>
            </td>
        `;
        tbody.appendChild(mainRow);

        // Create expanding row
        const detailRow = document.createElement('tr');
        detailRow.className = 'company-group-details';
        detailRow.style.display = 'none';

        const indicatorsTable = group.indicators.map(ind => {
            const indProfitSignals = ind.profit_signals || 0;
            const indLossSignals = ind.loss_signals || 0;
            const indSoldOutSignals = ind.sold_out_signals || 0;
            const indTotalSignals = ind.total_signals || 0;
            
            // Success rate = profit / completed (exclude OPEN and NOT_TRADED)
            const indCompleted = indProfitSignals + indLossSignals + indSoldOutSignals;
            const indSuccessRate = indCompleted > 0 ? (indProfitSignals / indCompleted * 100) : 0;
            const indNetProfit = ind.net_profit_loss || 0;
            const indNotTraded = ind.not_traded_signals || 0;

            const scClass = indSuccessRate >= 70 ? 'success-high' : indSuccessRate >= 50 ? 'success-medium' : 'success-low';
            const pfClass = indNetProfit >= 0 ? 'profit' : 'loss';

            return `
                <tr>
                    <td class="center"><span class="indicator-badge">${ind.indicator === 'Short' || ind.indicator === 'Long' || ind.indicator === 'Standard' ? 'MACD_' + ind.indicator : ind.indicator}</span></td>
                    <td class="center">${ind.total_signals}</td>
                    <td class="center profit">${ind.profit_signals}</td>
                    <td class="center loss">${ind.loss_signals}</td>
                    <td class="center sold">${indSoldOutSignals}</td>
                    <td class="center">${ind.open_trades}</td>
                    <td class="center" style="color:#d32f2f">${indNotTraded}</td>
                    <td class="center"><span class="badge ${scClass}">${indSuccessRate.toFixed(1)}%</span></td>
                    <td class="center ${pfClass}"><strong>${indNetProfit >= 0 ? '+' : ''}${indNetProfit.toFixed(2)}%</strong></td>
                    <td class="center">
                        <a href="/scanner-detail/${encodeURIComponent(group.symbol)}?indicator=${encodeURIComponent(ind.indicator)}&target=${currentScanParams.target}&stop_loss=${currentScanParams.stopLoss}&days=${currentScanParams.holdingDays}&from_date=${currentScanParams.fromDate || ''}&to_date=${currentScanParams.toDate || ''}" 
                           class="btn-view" style="padding: 2px 8px; font-size: 0.75rem;" target="_blank" title="View only ${ind.indicator}">VIEW</a>
                    </td>
                </tr>
            `;
        }).join('');

        detailRow.innerHTML = `
            <td colspan="12" style="padding: 0;">
                <div class="group-details-container">
                    <table class="group-details-table">
                        <thead>
                            <tr>
                                <th>Indicator</th>
                                <th>Total</th>
                                <th>Profit</th>
                                <th>Loss</th>
                                <th>Sold</th>
                                <th>Open</th>
                                <th>Not Traded</th>
                                <th>Success</th>
                                <th>Total P/L</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${indicatorsTable}
                        </tbody>
                    </table>
                </div>
            </td>
        `;
        tbody.appendChild(detailRow);
    });
}

function applyScanSort(results, sortBy) {
    const sorted = [...results];
    
    // Sort direction multiplier
    const m = currentSortDir === 'desc' ? 1 : -1;

    sorted.sort((a, b) => {
        let valA, valB;

        switch (sortBy) {
            case 'total':
                valA = a.total_signals || 0;
                valB = b.total_signals || 0;
                break;
            case 'profit':
                valA = a.profit_signals || 0;
                valB = b.profit_signals || 0;
                break;
            case 'loss':
                valA = a.loss_signals || 0;
                valB = b.loss_signals || 0;
                break;
            case 'open':
                valA = a.open_trades || 0;
                valB = b.open_trades || 0;
                break;
            case 'notTraded':
                valA = a.not_traded_signals || 0;
                valB = b.not_traded_signals || 0;
                break;
            case 'success':
                // Success rate = profit / completed (exclude OPEN and NOT_TRADED)
                {
                    const aP = a._enriched_profit  !== undefined ? a._enriched_profit  : (a.profit_signals    || 0);
                    const aL = a._enriched_loss    !== undefined ? a._enriched_loss    : (a.loss_signals      || 0);
                    const aS = a._enriched_sold    !== undefined ? a._enriched_sold    : (a.sold_out_signals  || 0);
                    const aC = aP + aL + aS;
                    valA = aC > 0 ? aP / aC : 0;

                    const bP = b._enriched_profit  !== undefined ? b._enriched_profit  : (b.profit_signals    || 0);
                    const bL = b._enriched_loss    !== undefined ? b._enriched_loss    : (b.loss_signals      || 0);
                    const bS = b._enriched_sold    !== undefined ? b._enriched_sold    : (b.sold_out_signals  || 0);
                    const bC = bP + bL + bS;
                    valB = bC > 0 ? bP / bC : 0;
                }
                break;
            case 'netProfit':
                // Use enriched value if available (ungrouped), total_net_profit for groups, net_profit_loss fallback
                valA = (typeof a._enriched_net_profit !== 'undefined') ? a._enriched_net_profit
                     : (typeof a.total_net_profit !== 'undefined') ? a.total_net_profit : (a.net_profit_loss || 0);
                valB = (typeof b._enriched_net_profit !== 'undefined') ? b._enriched_net_profit
                     : (typeof b.total_net_profit !== 'undefined') ? b.total_net_profit : (b.net_profit_loss || 0);
                break;
            case 'symbol':
                return m * b.symbol.localeCompare(a.symbol);
            default:
                return 0;
        }

        if (valA < valB) return 1 * m;
        if (valA > valB) return -1 * m;
        return 0;
    });
    return sorted;
}

function updateResultsBadges(results) {
    const badgesEl = document.getElementById('resultsBadges');
    if (!badgesEl) return;

    let total = 0, profit = 0, loss = 0, sold = 0, open = 0, nt = 0, totalPL = 0;

    results.forEach(r => {
        // Simple sum — same logic for both grouped and ungrouped
        total   += r.total_signals      || 0;
        profit  += r.profit_signals     || 0;
        loss    += r.loss_signals       || 0;
        sold    += r.sold_out_signals   || 0;
        open    += r.open_trades        || 0;
        nt      += r.not_traded_signals || 0;
        // Grouped uses total_net_profit, ungrouped uses net_profit_loss — both set from API
        totalPL += r.total_net_profit !== undefined ? r.total_net_profit : (r.net_profit_loss || 0);
    });

    document.getElementById('rb-total').textContent  = total;
    document.getElementById('rb-profit').textContent = profit;
    document.getElementById('rb-loss').textContent   = loss;
    document.getElementById('rb-sold').textContent   = sold;
    document.getElementById('rb-open').textContent   = open;
    document.getElementById('rb-nt').textContent     = nt;

    const plEl    = document.getElementById('rb-pl');
    const plBadge = document.getElementById('rb-pl-badge');
    if (plEl && plBadge) {
        const plRounded = Math.round(totalPL * 100) / 100;
        plEl.textContent  = (plRounded >= 0 ? '+' : '') + plRounded.toFixed(2) + '%';
        plBadge.className = 'rbadge ' + (plRounded >= 0 ? 'rbadge-pl-pos' : 'rbadge-pl-neg');
        plBadge.style.display = '';
    }

    badgesEl.style.display = 'flex'; // always visible — shows zeros when no results match
}

function updatePaginationControls(totalResults, totalPages) {
    const paginationInfo = document.getElementById('paginationInfo');
    const paginationButtons = document.getElementById('paginationButtons');
    const paginationBottomButtons = document.getElementById('paginationBottomButtons');

    if (totalResults === 0) {
        paginationInfo.textContent = '';
        paginationButtons.innerHTML = '';
        paginationBottomButtons.innerHTML = '';
        return;
    }

    const startIndex = (currentScanPage - 1) * SCAN_ITEMS_PER_PAGE + 1;
    const endIndex = Math.min(currentScanPage * SCAN_ITEMS_PER_PAGE, totalResults);

    paginationInfo.textContent = `Showing ${startIndex}-${endIndex} of ${totalResults}`;

    const buttonsHTML = `
        <button onclick="changeScanPage(1)" ${currentScanPage === 1 ? 'disabled' : ''} 
                style="padding: 6px 12px; margin: 0 2px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">« First</button>
        <button onclick="changeScanPage(${currentScanPage - 1})" ${currentScanPage === 1 ? 'disabled' : ''}
                style="padding: 6px 12px; margin: 0 2px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">‹ Prev</button>
        <span style="padding: 6px 12px; margin: 0 8px;">Page ${currentScanPage} of ${totalPages}</span>
        <button onclick="changeScanPage(${currentScanPage + 1})" ${currentScanPage === totalPages ? 'disabled' : ''}
                style="padding: 6px 12px; margin: 0 2px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">Next ›</button>
        <button onclick="changeScanPage(${totalPages})" ${currentScanPage === totalPages ? 'disabled' : ''}
                style="padding: 6px 12px; margin: 0 2px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer;">Last »</button>
    `;

    paginationButtons.innerHTML = buttonsHTML;
    paginationBottomButtons.innerHTML = buttonsHTML;
}

function applySortAndFilter() {
    if (allScanResults.length === 0) return;

    currentScanPage = 1; // Reset to first page
    displayScanResults(allScanResults, false);
}

// Search functionality
function setupScannerSearch() {
    const searchInput = document.getElementById('scannerSearch');
    const clearBtn = document.getElementById('clearScannerSearch');

    if (!searchInput) return;

    searchInput.addEventListener('input', function () {
        currentSearchTerm = this.value.toLowerCase().trim();
        if (clearBtn) clearBtn.style.display = currentSearchTerm ? 'block' : 'none';
        currentScanPage = 1;
        displayScanResults(allScanResults, false);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            searchInput.value = '';
            currentSearchTerm = '';
            clearBtn.style.display = 'none';
            currentScanPage = 1;
            displayScanResults(allScanResults, false);
        });
    }
}

// Enrich a batch of ungrouped rows with accurate counts from /api/scanner/analyze
async function enrichUngroupedStats(rows) {
    if (rows.length === 0) return;
    const params = currentScanParams;
    await Promise.all(rows.map(async row => {
        const ind = row.indicator || '';
        if (!ind) return;
        // Skip if already enriched
        if (row._enriched_total !== undefined) return;
        const url = `/api/scanner/analyze?symbol=${encodeURIComponent(row.symbol)}&indicator=${encodeURIComponent(ind)}&target=${params.target}&stop_loss=${params.stopLoss}&days=${params.holdingDays}&from_date=${params.fromDate || ''}&to_date=${params.toDate || ''}`;
        try {
            const resp = await fetch(url);
            if (!resp.ok) return;
            const data = await resp.json();
            if (data.totalSignals !== undefined) {
                row._enriched_total      = data.totalSignals;
                row._enriched_profit     = data.successful;
                row._enriched_loss       = data.failed;
                row._enriched_sold       = data.soldOut || 0;
                row._enriched_open       = data.openTrades;
                row._enriched_not_traded = data.notTradedSignals || 0;
                row._enriched_net_profit = data.totalMaxProfit;
            }
        } catch (e) {
            console.warn(`[UNGROUPED ENRICH] Failed for ${row.symbol}/${ind}:`, e);
        }
    }));
}

async function enrichGroupedStats(groups) {
    // Grouped view shows raw sums (matching the detail page table).
    // No enrichment needed — stats are already computed as raw sums in groupResultsByCompany.
}

function groupResultsByCompany(results) {
    const grouped = {};

    results.forEach(result => {
        if (!grouped[result.symbol]) {
            grouped[result.symbol] = {
                symbol: result.symbol,
                indicators: [],
                total_signals: 0,
                profit_signals: 0,
                loss_signals: 0,
                sold_out_signals: 0,
                open_trades: 0,
                not_traded_signals: 0,
                executed_signals: 0,
                max_success_rate: 0,
                total_net_profit: 0
            };
        }

        const group = grouped[result.symbol];
        group.indicators.push({
            indicator: result.indicator,
            total_signals: result.total_signals,
            profit_signals: result.profit_signals,
            loss_signals: result.loss_signals,
            sold_out_signals: result.sold_out_signals || 0,
            open_trades: result.open_trades,
            not_traded_signals: result.not_traded_signals,
            executed_signals: result.executed_signals,
            success_rate: result.success_rate,
            net_profit_loss: result.net_profit_loss,
            date_pl_map: result.date_pl_map || {},
            date_result_map: result.date_result_map || {}
        });

        // Raw sums (will be overridden below if date maps are available)
        group.total_signals += result.total_signals;
        group.not_traded_signals += (result.not_traded_signals || 0);
        group.open_trades += result.open_trades;
        group.executed_signals += (result.executed_signals || 0);
        group.max_success_rate = Math.max(group.max_success_rate, result.success_rate || 0);
    });

    // 1-date-1-trade dedup: merge all indicator date maps, pick best result per date
    Object.values(grouped).forEach(group => {
        const COMPLETED = new Set(['SUCCESS', 'FAIL', 'SOLD_OUT']);
        const mergedPL  = {};
        const mergedRes = {};

        let hasDateMaps = false;
        group.indicators.forEach(ind => {
            const plMap  = ind.date_pl_map  || {};
            const resMap = ind.date_result_map || {};
            if (Object.keys(plMap).length > 0) hasDateMaps = true;
            Object.entries(plMap).forEach(([date, pl]) => {
                const res = resMap[date] || (pl > 0 ? 'SUCCESS' : 'FAIL');
                if (!(date in mergedPL)) {
                    mergedPL[date]  = pl;
                    mergedRes[date] = res;
                } else {
                    const exRes = mergedRes[date];
                    if (COMPLETED.has(res) && !COMPLETED.has(exRes)) {
                        mergedPL[date] = pl; mergedRes[date] = res;
                    } else if (COMPLETED.has(res) && COMPLETED.has(exRes) && pl > mergedPL[date]) {
                        mergedPL[date] = pl; mergedRes[date] = res;
                    } else if (res === 'OPEN' && exRes === 'NOT_TRADED') {
                        mergedPL[date] = pl; mergedRes[date] = res;
                    }
                }
            });
        });

        if (hasDateMaps) {
            // Counts from deduped map (1-date-1-trade)
            let profit = 0, loss = 0, sold = 0, open = 0, notTraded = 0;
            Object.entries(mergedRes).forEach(([date, res]) => {
                if      (res === 'SUCCESS')    profit++;
                else if (res === 'FAIL')       loss++;
                else if (res === 'SOLD_OUT')   sold++;
                else if (res === 'OPEN')       open++;
                else if (res === 'NOT_TRADED') notTraded++;
            });
            group.profit_signals     = profit;
            group.loss_signals       = loss;
            group.sold_out_signals   = sold;
            group.open_trades        = open;
            group.not_traded_signals = notTraded;
            group.total_signals      = Object.keys(mergedRes).length;

            group.total_net_profit = Math.round(
                Object.entries(mergedPL).reduce((s, [date, pl]) => {
                    return COMPLETED.has(mergedRes[date]) ? s + pl : s;
                }, 0) * 100
            ) / 100;
        } else {
            // Fallback: raw sums
            group.profit_signals     = group.indicators.reduce((s, i) => s + (i.profit_signals    || 0), 0);
            group.loss_signals       = group.indicators.reduce((s, i) => s + (i.loss_signals      || 0), 0);
            group.sold_out_signals   = group.indicators.reduce((s, i) => s + (i.sold_out_signals  || 0), 0);
            group.open_trades        = group.indicators.reduce((s, i) => s + (i.open_trades       || 0), 0);
            group.not_traded_signals = group.indicators.reduce((s, i) => s + (i.not_traded_signals|| 0), 0);
            group.total_signals      = group.indicators.reduce((s, i) => s + (i.total_signals     || 0), 0);
            group.total_net_profit   = Math.round(
                group.indicators.reduce((sum, ind) => sum + (ind.net_profit_loss || 0), 0) * 100
            ) / 100;
        }

        const completedTotal = group.profit_signals + group.loss_signals + group.sold_out_signals;
        group.max_success_rate = completedTotal > 0 ? (group.profit_signals / completedTotal * 100) : 0;
    });

    return Object.values(grouped);
}

function applySearchFilter(results) {
    // Get selected indicators for client-side filtering
    const selectedIndicators = getSelectedIndicators();
    const allIndicators = ['SMA5','SMA10','SMA20','SMA50','SMA100','SMA200',
        'RSI7','RSI14','RSI21','RSI50','RSI80',
        'BB10_Lower','BB20_Lower','BB50_Lower','BB100_Lower',
        'Short','Long','Standard',
        'STOCH5','STOCH9','STOCH14','STOCH21','STOCH50'];
    const filterByIndicator = selectedIndicators.length > 0 && selectedIndicators.length < allIndicators.length;

    return results.filter(result => {
        // Indicator filter (client-side when subset selected)
        if (filterByIndicator) {
            const ind = result.indicator || '';
            if (!selectedIndicators.includes(ind)) return false;
        }

        // Min success % filter
        if (minSuccessFilter > 0) {
            const profit = result.profit_signals || 0;
            const loss   = result.loss_signals   || 0;
            const sold   = result.sold_out_signals || 0;
            const completed = profit + loss + sold;
            const rate = completed > 0 ? (profit / completed * 100) : 0;
            if (rate < minSuccessFilter) return false;
        }

        // Search term filter
        if (!currentSearchTerm) return true;

        const term = currentSearchTerm.toLowerCase();
        // Strip NSE: prefix for more forgiving symbol search
        const symbol = (result.symbol || '').toLowerCase().replace('nse:', '');
        const symbolFull = (result.symbol || '').toLowerCase();
        const indicator = (result.indicator || '').toLowerCase();
        return symbol.includes(term) || symbolFull.includes(term) || indicator.includes(term);
    });
}

function resetForm() {
    document.getElementById('scannerTarget').value = '5';
    document.getElementById('scannerStopLoss').value = '3';
    document.getElementById('holdingDays').value = '30';
    clearAllIndicators(); // reset multi-select to "All"

    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    document.getElementById('scannerToDate').valueAsDate = today;
    document.getElementById('scannerFromDate').valueAsDate = oneYearAgo;

    document.getElementById('scannerResults').style.display = 'none';
    allScanResults = [];
    cachedScanData = null;
    cacheTimestamp = null;
    currentSortBy = 'success';

    showNotification('Form reset to defaults', 'info');
}

async function clearCache() {
    try {
        // Clear client-side cache first
        const hadClientCache = cachedScanData !== null;
        cachedScanData = null;
        cacheTimestamp = null;

        console.log('🗑️ [SCANNER] Clearing server cache...');

        const response = await fetch('/api/clear-scanner-cache', {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            const message = hadClientCache
                ? 'Both client and server cache cleared successfully'
                : data.message;
            showNotification(message, 'success');
            console.log('✅ [SCANNER] Cache cleared');
        } else {
            showNotification('Failed to clear server cache', 'error');
        }
    } catch (error) {
        console.error('❌ [CACHE] Error:', error);
        showNotification('Failed to clear cache: ' + error.message, 'error');
    }
}

function showNotification(message, type = 'info') {
    const color = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6';
    console.log(`[${type.toUpperCase()}] ${message}`);
    const notification = document.createElement('div');
    notification.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${color}; color: white; padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10000; max-width: 400px; font-size: 14px;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Debug function to check cache status
function getCacheStatus() {
    if (!cachedScanData) {
        console.log('📊 [CACHE STATUS] No cache data');
        return;
    }

    const now = Date.now();
    const age = Math.round((now - cacheTimestamp) / 1000);
    const ttl = Math.round(CACHE_TTL / 1000);
    const remaining = Math.max(0, ttl - age);

    console.log('📊 [CACHE STATUS]');
    console.log(`  Cache Key: ${cachedScanData.cacheKey}`);
    console.log(`  Results: ${cachedScanData.results.length} companies`);
    console.log(`  Age: ${age}s / ${ttl}s`);
    console.log(`  Remaining: ${remaining}s`);
    console.log(`  Valid: ${remaining > 0 ? '✅' : '❌'}`);
}

// Make it available globally for debugging
window.getCacheStatus = getCacheStatus;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    const scanBtn = document.getElementById('scanBtn');
    const resetBtn = document.getElementById('resetBtn');
    const clearCacheBtn = document.getElementById('clearCacheBtn');

    // Set default dates (1 year ago to today)
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    document.getElementById('scannerToDate').valueAsDate = today;
    document.getElementById('scannerFromDate').valueAsDate = oneYearAgo;

    if (scanBtn) scanBtn.addEventListener('click', performScanFast);
    if (resetBtn) resetBtn.addEventListener('click', resetForm);
    if (clearCacheBtn) clearCacheBtn.addEventListener('click', clearCache);

    // Setup multi-select indicator pill UI
    setupIndicatorMultiSelect();

    // Setup search functionality
    setupScannerSearch();

    // Setup min success % filter
    const minSuccessInput = document.getElementById('minSuccessFilter');
    if (minSuccessInput) {
        minSuccessInput.addEventListener('input', function () {
            let val = parseFloat(this.value) || 0;
            if (val > 100) { val = 100; this.value = 100; }  // cap at 100 — success rate can't exceed 100%
            minSuccessFilter = val;
            currentScanPage = 1;
            if (allScanResults.length > 0) displayScanResults(allScanResults, false);
        });
    }

    // Setup group by company toggle
    const groupByCheckbox = document.getElementById('groupByCompany');
    if (groupByCheckbox) {
        groupByCheckbox.addEventListener('change', function () {
            isGroupedView = this.checked;
            currentScanPage = 1;
            if (allScanResults.length > 0) {
                displayScanResults(allScanResults, false);
            }
        });
    }
});

// ── Multi-select indicator pill UI ──────────────────────────────────────────

function getSelectedIndicators() {
    const checkboxes = document.querySelectorAll('#indicatorDropdown input[type=checkbox]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function updateIndicatorTrigger() {
    const selected = getSelectedIndicators();
    const triggerText = document.getElementById('indicatorTriggerText');
    if (!triggerText) return;
    if (selected.length === 0) {
        triggerText.textContent = 'All Indicators';
    } else if (selected.length <= 3) {
        triggerText.textContent = selected.join(', ');
    } else {
        triggerText.textContent = `${selected.length} Indicators`;
    }
}

function selectAllIndicators() {
    document.querySelectorAll('#indicatorDropdown input[type=checkbox]').forEach(cb => {
        cb.checked = true;
        cb.closest('.ind-pill').classList.add('selected');
    });
    updateIndicatorTrigger();
    if (allScanResults.length > 0) { currentScanPage = 1; displayScanResults(allScanResults, false); }
}

function clearAllIndicators() {
    document.querySelectorAll('#indicatorDropdown input[type=checkbox]').forEach(cb => {
        cb.checked = false;
        cb.closest('.ind-pill').classList.remove('selected');
    });
    updateIndicatorTrigger();
    if (allScanResults.length > 0) { currentScanPage = 1; displayScanResults(allScanResults, false); }
}

function setupIndicatorMultiSelect() {
    const trigger = document.getElementById('indicatorTrigger');
    const dropdown = document.getElementById('indicatorDropdown');
    if (!trigger || !dropdown) return;

    // Toggle dropdown on trigger click
    trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        const isOpen = dropdown.style.display !== 'none';
        dropdown.style.display = isOpen ? 'none' : 'block';
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
        if (!document.getElementById('indicatorMultiSelect')?.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    // Toggle pill selected state on checkbox change
    dropdown.querySelectorAll('input[type=checkbox]').forEach(cb => {
        cb.addEventListener('change', function () {
            this.closest('.ind-pill').classList.toggle('selected', this.checked);
            updateIndicatorTrigger();
            // Re-filter displayed results client-side (no new fetch needed)
            if (allScanResults.length > 0) {
                currentScanPage = 1;
                displayScanResults(allScanResults, false);
            }
        });
    });
}

// Expose for HTML onclick
window.selectAllIndicators = selectAllIndicators;
window.clearAllIndicators = clearAllIndicators;
