const STORAGE_KEY = 'personal_banking_portal_v1';

const defaultState = () => ({
    checking: 1500.0,
    savings: 5000.0,
    history: [
        createTransaction('checking', 'deposit', 1200, 'Initial checking balance'),
        createTransaction('savings', 'deposit', 5000, 'Initial savings balance')
    ]
});

function createTransaction(account, type, amount, description) {
    return {
        id: crypto.randomUUID(),
        date: new Date().toLocaleString(),
        account,
        type,
        amount,
        description
    };
}

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        const initialState = defaultState();
        saveState(initialState);
        return initialState;
    }

    try {
        const parsed = JSON.parse(raw);
        return {
            checking: Number(parsed.checking) || 0,
            savings: Number(parsed.savings) || 0,
            history: Array.isArray(parsed.history) ? parsed.history : []
        };
    } catch {
        const fallback = defaultState();
        saveState(fallback);
        return fallback;
    }
}

function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
}

function setStatus(message, isError = false) {
    const status = document.getElementById('statusMessage');
    status.textContent = message;
    status.style.color = isError ? '#d64545' : '#60708c';
}

function getAmountInput(account) {
    return document.getElementById(account === 'checking' ? 'checkingAmount' : 'savingsAmount');
}

function readPositiveAmount(input) {
    const amount = Number.parseFloat(input.value);
    if (!Number.isFinite(amount) || amount <= 0) {
        setStatus('Enter an amount greater than zero.', true);
        input.focus();
        return null;
    }

    return Math.round(amount * 100) / 100;
}

function render() {
    const state = loadState();

    document.getElementById('checkingBalance').textContent = formatCurrency(state.checking);
    document.getElementById('savingsBalance').textContent = formatCurrency(state.savings);
    document.getElementById('totalBalance').textContent = formatCurrency(state.checking + state.savings);
    document.getElementById('checkingCardBalance').textContent = formatCurrency(state.checking);
    document.getElementById('savingsCardBalance').textContent = formatCurrency(state.savings);

    const body = document.getElementById('transactionTableBody');
    const history = state.history.slice(0, 12);

    if (!history.length) {
        body.innerHTML = '<tr><td colspan="5" class="empty-state">No activity yet.</td></tr>';
        return;
    }

    body.innerHTML = history.map((tx) => {
        const signedAmount = tx.type === 'withdraw' ? -tx.amount : tx.amount;
        const amountClass = signedAmount >= 0 ? 'amount-positive' : 'amount-negative';
        const badgeClass = tx.type === 'transfer' ? 'transfer' : tx.type;
        const label = tx.type.charAt(0).toUpperCase() + tx.type.slice(1);

        return `
            <tr>
                <td>${tx.date}</td>
                <td>${capitalize(tx.account)}</td>
                <td><span class="badge ${badgeClass}">${label}</span></td>
                <td>${tx.description}</td>
                <td class="amount-value ${amountClass}">${signedAmount >= 0 ? '+' : '-'}${formatCurrency(Math.abs(signedAmount))}</td>
            </tr>
        `;
    }).join('');
}

function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function applyTransaction(account, action) {
    const input = getAmountInput(account);
    const amount = readPositiveAmount(input);
    if (amount === null) {
        return;
    }

    const state = loadState();
    if (action === 'withdraw' && state[account] < amount) {
        setStatus(`Insufficient funds in ${account}.`, true);
        return;
    }

    state[account] += action === 'deposit' ? amount : -amount;
    state.history.unshift(
        createTransaction(account, action, amount, `${capitalize(action)} ${formatCurrency(amount)} ${action === 'deposit' ? 'into' : 'from'} ${account}`)
    );

    saveState(state);
    input.value = '';
    setStatus(`${capitalize(action)} completed for ${capitalize(account)}.`);
    render();
}

function applyTransfer() {
    const from = document.getElementById('fromAccount').value;
    const to = document.getElementById('toAccount').value;
    const input = document.getElementById('transferAmount');
    const amount = readPositiveAmount(input);

    if (amount === null) {
        return;
    }

    if (from === to) {
        setStatus('Choose two different accounts for a transfer.', true);
        return;
    }

    const state = loadState();
    if (state[from] < amount) {
        setStatus(`Insufficient funds in ${from}.`, true);
        return;
    }

    state[from] -= amount;
    state[to] += amount;
    state.history.unshift(
        createTransaction(to, 'transfer', amount, `Transferred ${formatCurrency(amount)} from ${capitalize(from)} to ${capitalize(to)}`)
    );

    saveState(state);
    input.value = '';
    setStatus(`Transferred ${formatCurrency(amount)} from ${capitalize(from)} to ${capitalize(to)}.`);
    render();
}

function resetApp() {
    localStorage.removeItem(STORAGE_KEY);
    setStatus('Application reset to default balances.');
    render();
}

function seedDemoData() {
    const state = defaultState();
    state.history.unshift(
        createTransaction('checking', 'withdraw', 85.42, 'Debit card purchase'),
        createTransaction('savings', 'deposit', 250, 'Automatic savings transfer'),
        createTransaction('checking', 'transfer', 300, 'Transfer from savings to checking')
    );
    saveState(state);
    setStatus('Demo data loaded.');
    render();
}

function wireEvents() {
    document.querySelectorAll('[data-account][data-action]').forEach((button) => {
        button.addEventListener('click', () => {
            applyTransaction(button.dataset.account, button.dataset.action);
        });
    });

    document.getElementById('transferBtn').addEventListener('click', applyTransfer);
    document.getElementById('resetBtn').addEventListener('click', resetApp);
    document.getElementById('seedDemoBtn').addEventListener('click', seedDemoData);
}

wireEvents();
render();
setStatus('Ready. Balances are stored in your browser.');
