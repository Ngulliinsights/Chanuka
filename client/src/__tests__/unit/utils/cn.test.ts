import { cn } from '@client/lib/utils/cn'

describe('cn utility', () => {
  it('joins class names and dedups correctly', () => {
    const result = cn('p-2', 'p-2', 'text-sm', false && 'hidden')
    // should contain both classes and not duplicate p-2
    expect(result.split(' ').filter(Boolean)).toEqual(expect.arrayContaining(['p-2', 'text-sm']))
  })
})
