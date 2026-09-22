import { createRedirectBudget, createTokenBucket } from './request-budget'

it('bounds bursts and refills at the configured rate', () => {
    let time = 0
    const take = createTokenBucket({ rate: 2, capacity: 2, now: () => time })
    expect([take(), take(), take()]).toEqual([true, true, false])
    time = 500
    expect([take(), take()]).toEqual([true, false])
    time = 10000
    expect([take(), take(), take()]).toEqual([true, true, false])
})

it('bounds concurrent redirects and releases a slot only once', () => {
    const budget = createRedirectBudget()
    const releases = Array.from({ length: 10 }, () =>
        budget.acquire('192.0.2.1')
    )
    expect(releases.every((release) => typeof release === 'function')).toBe(
        true
    )
    expect(budget.acquire('192.0.2.1')).toBeNull()
    expect(typeof budget.acquire('192.0.2.2')).toBe('function')
    releases[0]()
    releases[0]()
    expect(typeof budget.acquire('192.0.2.1')).toBe('function')
    expect(budget.acquire('192.0.2.1')).toBeNull()
})

it('keeps rate and refill independent for each IP', () => {
    let time = 0
    const budget = createRedirectBudget({ now: () => time })
    for (let i = 0; i < 20; i += 1) budget.acquire('192.0.2.1')()
    expect(budget.acquire('192.0.2.1')).toBeNull()
    expect(typeof budget.acquire('192.0.2.2')).toBe('function')
    time = 100
    expect(typeof budget.acquire('192.0.2.1')).toBe('function')
    expect(budget.acquire('192.0.2.1')).toBeNull()
})

it('bounds idle history without evicting in-flight client limits', () => {
    let time = 0
    const budget = createRedirectBudget({ now: () => time, maxIdleClients: 2 })
    const active = Array.from({ length: 10 }, () => budget.acquire('192.0.2.1'))
    for (const ip of ['192.0.2.2', '192.0.2.3', '192.0.2.4']) {
        for (let i = 0; i < 20; i += 1) budget.acquire(ip)()
    }
    expect(budget.acquire('192.0.2.1')).toBeNull()
    expect(budget.acquire('192.0.2.4')).toBeNull()
    expect(typeof budget.acquire('192.0.2.2')).toBe('function')
    active.forEach((release) => release())
    time = 60001
    expect(typeof budget.acquire('192.0.2.4')).toBe('function')
})
