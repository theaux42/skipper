
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Only run on server, not edge runtime
        const { startDomainValidationScheduler } = await import('./lib/scheduler')

        // Start the domain validation scheduler in the background
        startDomainValidationScheduler().catch(err => {
            console.error('[Startup] Failed to start domain validation scheduler:', err)
        })
    }
}
