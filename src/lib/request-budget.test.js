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
    const releases = Array.from({ length: 10 }, () => budget.acquire())
    expect(releases.every((release) => typeof release === 'function')).toBe(
        true
    )
    expect(budget.acquire()).toBeNull()
    releases[0]()
    releases[0]()
    expect(typeof budget.acquire()).toBe('function')
    expect(budget.acquire()).toBeNull()
})
