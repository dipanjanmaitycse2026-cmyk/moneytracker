import { useState, useEffect, useMemo } from 'react'
import type { FormEvent } from 'react'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import Login from './Login'

export type Category =
  | 'Salary'
  | 'Freelance'
  | 'Investment'
  | 'Food & Dining'
  | 'Groceries'
  | 'Bills & Utilities'
  | 'Shopping'
  | 'Entertainment'
  | 'Travel'
  | 'Other'

export type Transaction = {
  id: number
  user_id: string
  title: string
  amount: number
  type: 'income' | 'expense'
  category: Category
  created_at: string
}

type TabType = 'overview' | 'transactions' | 'add'

const CATEGORIES: Category[] = [
  'Salary',
  'Freelance',
  'Investment',
  'Food & Dining',
  'Groceries',
  'Bills & Utilities',
  'Shopping',
  'Entertainment',
  'Travel',
  'Other',
]

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)

  // Form states
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [category, setCategory] = useState<Category>('Groceries')
  const [submitting, setSubmitting] = useState(false)

  // Search and Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      setTransactions([])
      return
    }

    async function fetchTransactions() {
      setLoadingTransactions(true)
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching transactions:', error.message)
      } else if (data) {
        setTransactions(data as Transaction[])
      }
      setLoadingTransactions(false)
    }

    fetchTransactions()
  }, [user])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedAmount = Number(amount)

    if (
      !title.trim() ||
      !amount.trim() ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      alert('Please enter a valid description and a positive amount.')
      return
    }

    setSubmitting(true)
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          title: title.trim(),
          amount: parsedAmount,
          type,
          category,
        },
      ])
      .select()

    if (error) {
      alert(`Failed to save: ${error.message}`)
    } else if (data) {
      setTransactions((prev) => [data[0] as Transaction, ...prev])
      setTitle('')
      setAmount('')
      setType('expense')
      setCategory('Groceries')
      setActiveTab('transactions')
    }
    setSubmitting(false)
  }

  async function deleteTransaction(id: number) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)

    if (error) {
      alert(`Failed to delete: ${error.message}`)
    } else {
      setTransactions((prev) => prev.filter((item) => item.id !== id))
    }
  }

  const exportCSV = () => {
    if (transactions.length === 0) return
    const headers = ['ID,Title,Type,Category,Amount,Date\n']
    const rows = transactions.map(
      (t) =>
        `"${t.id}","${t.title}","${t.type}","${t.category}","${t.amount}","${new Date(
          t.created_at
        ).toLocaleDateString()}"\n`
    )
    const blob = new Blob([...headers, ...rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `monetra-transactions-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const income = transactions
    .filter((item) => item.type === 'income')
    .reduce((total, item) => total + Number(item.amount), 0)

  const expenses = transactions
    .filter((item) => item.type === 'expense')
    .reduce((total, item) => total + Number(item.amount), 0)

  const balance = income - expenses

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = typeFilter === 'all' || item.type === typeFilter
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
      return matchesSearch && matchesType && matchesCategory
    })
  }, [transactions, searchQuery, typeFilter, categoryFilter])

  const money = (value: number) =>
    `₹${value.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  if (authLoading) {
    return (
      <div className="auth-shell">
        <div style={{ color: 'var(--purple)', fontSize: '13px' }}>Loading workspace...</div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  const userName =
    user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'

  const renderTransactionRows = (items: Transaction[]) => (
    <div className="transaction-list">
      {items.map((item) => (
        <article className="transaction-row" key={item.id}>
          <div
            className={`transaction-icon ${
              item.type === 'income' ? 'transaction-income' : 'transaction-expense'
            }`}
          >
            {item.type === 'income' ? '↙' : '↗'}
          </div>

          <div className="transaction-info">
            <strong>{item.title}</strong>
            <span className="transaction-meta">
              <span>{item.category}</span>
              <span>
                •{' '}
                {new Date(item.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </span>
          </div>

          <div
            className={`transaction-amount ${
              item.type === 'income' ? 'amount-income' : 'amount-expense'
            }`}
          >
            {item.type === 'income' ? '+' : '−'}
            {money(Number(item.amount))}
          </div>

          <button
            type="button"
            className="delete-button"
            onClick={() => deleteTransaction(item.id)}
            aria-label={`Delete ${item.title}`}
            title="Delete transaction"
          >
            ×
          </button>
        </article>
      ))}
    </div>
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          type="button"
          className="brand brand-btn"
          onClick={() => setActiveTab('overview')}
        >
          <span className="brand-icon">₹</span>
          <span>
            Monetra<span className="brand-dot">.</span>
          </span>
        </button>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <button
            type="button"
            className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="nav-icon">▦</span>
            Overview
          </button>
          <button
            type="button"
            className={`nav-link ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <span className="nav-icon">↕</span>
            Transactions
          </button>
          <button
            type="button"
            className={`nav-link ${activeTab === 'add' ? 'active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            <span className="nav-icon">＋</span>
            Add transaction
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon">✦</span>
            <h3>Build better habits</h3>
            <p>Small steps today can make a big difference tomorrow.</p>
          </div>

          <div className="sidebar-footer">
            <div className="avatar">{userName.charAt(0).toUpperCase()}</div>
            <div className="profile-text">
              <strong>{userName}</strong>
              <span>{user.email}</span>
            </div>
            <button
              type="button"
              className="delete-button"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
            >
              ⎋
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {/* VIEW 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            <header className="topbar">
              <div>
                <div className="eyebrow">YOUR FINANCES, SIMPLIFIED</div>
                <h1>Overview</h1>
                <p className="page-subtitle">
                  Welcome back, {userName}! Here's your cloud-synced financial snapshot.
                </p>
              </div>

              <button
                type="button"
                className="topbar-button"
                onClick={() => setActiveTab('add')}
              >
                <span>＋</span> New transaction
              </button>
            </header>

            <section className="balance-card">
              <div className="balance-content">
                <div className="balance-label">
                  <span className="balance-symbol">₹</span>
                  TOTAL BALANCE
                </div>

                <div className="balance-amount">{money(balance)}</div>
                <p className="balance-caption">Your income minus your expenses</p>
              </div>

              <div className="balance-decoration" aria-hidden="true">
                <div className="decoration-ring ring-one" />
                <div className="decoration-ring ring-two" />
                <div className="decoration-center">₹</div>
              </div>

              <div className="balance-footer">
                <span className="status-dot" />
                Securely synced with Supabase
              </div>
            </section>

            <section className="summary-grid" aria-label="Financial summary">
              <article className="summary-card income-card">
                <div className="summary-top">
                  <div className="summary-icon income-icon">↙</div>
                  <span className="summary-tag">INCOME</span>
                </div>
                <p className="summary-label">Total income</p>
                <h2>{money(income)}</h2>
                <div className="summary-note">
                  <span className="note-symbol">↗</span>
                  Money coming in
                </div>
                <div className="summary-line income-line" />
              </article>

              <article className="summary-card expense-card">
                <div className="summary-top">
                  <div className="summary-icon expense-icon">↗</div>
                  <span className="summary-tag">EXPENSES</span>
                </div>
                <p className="summary-label">Total expenses</p>
                <h2>{money(expenses)}</h2>
                <div className="summary-note">
                  <span className="note-symbol">↘</span>
                  Money going out
                </div>
                <div className="summary-line expense-line" />
              </article>

              <article className="summary-card activity-card">
                <div className="summary-top">
                  <div className="summary-icon activity-icon">▤</div>
                  <span className="summary-tag">ACTIVITY</span>
                </div>
                <p className="summary-label">Transactions</p>
                <h2>{transactions.length}</h2>
                <div className="summary-note">Total entries recorded</div>
                <div className="summary-line activity-line" />
              </article>
            </section>

            <section className="panel single-page-panel">
              <div className="panel-header">
                <div>
                  <h2>Recent activity</h2>
                  <p>Your latest entries</p>
                </div>
                <button
                  type="button"
                  className="empty-action"
                  onClick={() => setActiveTab('transactions')}
                >
                  View all →
                </button>
              </div>

              {loadingTransactions ? (
                <div className="empty-state">
                  <p>Loading transactions...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">↕</div>
                  <h3>No transactions yet</h3>
                  <p>Add your first entry to see records here.</p>
                  <button
                    type="button"
                    className="empty-action"
                    onClick={() => setActiveTab('add')}
                  >
                    Add transaction
                  </button>
                </div>
              ) : (
                renderTransactionRows(transactions.slice(0, 5))
              )}
            </section>
          </>
        )}

        {/* VIEW 2: TRANSACTIONS LIST */}
        {activeTab === 'transactions' && (
          <>
            <header className="topbar">
              <div>
                <div className="eyebrow">HISTORY & RECORDS</div>
                <h1>Transactions</h1>
                <p className="page-subtitle">
                  Browse, search, and manage your full financial logs.
                </p>
              </div>

              <div className="topbar-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={exportCSV}
                  disabled={transactions.length === 0}
                >
                  <span>↓</span> Export CSV
                </button>
                <button
                  type="button"
                  className="topbar-button"
                  onClick={() => setActiveTab('add')}
                >
                  <span>＋</span> Add new
                </button>
              </div>
            </header>

            <div className="filter-bar">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filter-selects">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as 'all' | 'income' | 'expense')}
                >
                  <option value="all">All Types</option>
                  <option value="income">Income only</option>
                  <option value="expense">Expenses only</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <section className="panel single-page-panel">
              <div className="panel-header">
                <div>
                  <h2>All Transactions</h2>
                  <p>
                    Showing {filteredTransactions.length} of {transactions.length} records
                  </p>
                </div>
                <span className="count-badge">{filteredTransactions.length}</span>
              </div>

              {loadingTransactions ? (
                <div className="empty-state">
                  <p>Loading transactions...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">↕</div>
                  <h3>No transactions found</h3>
                  <p>
                    {transactions.length === 0
                      ? 'Add your first transaction to get started.'
                      : 'No records match your filter criteria.'}
                  </p>
                  {transactions.length === 0 && (
                    <button
                      type="button"
                      className="empty-action"
                      onClick={() => setActiveTab('add')}
                    >
                      Add your first entry
                    </button>
                  )}
                </div>
              ) : (
                renderTransactionRows(filteredTransactions)
              )}
            </section>
          </>
        )}

        {/* VIEW 3: ADD TRANSACTION */}
        {activeTab === 'add' && (
          <>
            <header className="topbar">
              <div>
                <div className="eyebrow">NEW ENTRY</div>
                <h1>Add Transaction</h1>
                <p className="page-subtitle">
                  Record new incoming income or outgoing expenses.
                </p>
              </div>
            </header>

            <section className="panel form-panel single-page-form">
              <div className="panel-header">
                <div>
                  <h2>Transaction Details</h2>
                  <p>Enter the amount, category, and description</p>
                </div>
                <div className="form-header-icon">＋</div>
              </div>

              <form onSubmit={addTransaction}>
                <div className="form-field">
                  <label htmlFor="title">DESCRIPTION</label>
                  <input
                    id="title"
                    type="text"
                    placeholder="e.g. Monthly Salary, Grocery run, Internet bill"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="amount">AMOUNT (₹)</label>
                  <div className="amount-input-wrap">
                    <span>₹</span>
                    <input
                      id="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="type">TRANSACTION TYPE</label>
                  <select
                    id="type"
                    value={type}
                    onChange={(event) =>
                      setType(event.target.value as 'income' | 'expense')
                    }
                  >
                    <option value="expense">Expense — money spent</option>
                    <option value="income">Income — money received</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="category">CATEGORY</label>
                  <select
                    id="category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value as Category)}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="submit-button" disabled={submitting}>
                  <span>＋</span> {submitting ? 'Saving...' : 'Save transaction'}
                </button>
              </form>

              <div className="privacy-note">
                <span>◇</span>
                Synchronized directly with your encrypted Supabase database.
              </div>
            </section>
          </>
        )}

        <footer className="main-footer">
          <span>
            MONETRA <span className="brand-dot">.</span>
          </span>
          <span>Take control of your finances.</span>
        </footer>
      </main>
    </div>
  )
}

export default App