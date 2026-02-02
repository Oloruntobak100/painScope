import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div
          className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center p-6 font-sans"
          style={{ fontFamily: 'Rajdhani, system-ui, sans-serif' }}
        >
          <h1 className="text-xl font-bold mb-2 text-[#00f5d4]">Something went wrong</h1>
          <p className="text-gray-400 text-sm mb-4 max-w-md text-center">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#00f5d4] text-[#050508] font-medium rounded hover:opacity-90"
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
