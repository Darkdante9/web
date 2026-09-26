import {
  formatAmount,
  formatAmountValue,
  isZeroAmount,
  formatAmountCompact,
} from '../lib/formatAmount';

describe('formatAmount', () => {
  it('formats XLM with 7 decimal places', () => {
    expect(formatAmount('1', 'XLM')).toBe('1.0000000 XLM');
  });

  it('formats USDC with 2 decimal places', () => {
    expect(formatAmount('150.5', 'USDC')).toBe('150.50 USDC');
  });

  it('converts stroops to XLM', () => {
    expect(formatAmount('10000000', 'XLM', true)).toBe('1.0000000 XLM');
  });

  it('formats zero as 0.0000000 XLM', () => {
    expect(formatAmount(0, 'XLM')).toBe('0.0000000 XLM');
  });

  it('treats native as XLM label', () => {
    expect(formatAmount('1', 'native')).toBe('1.0000000 XLM');
  });

  it('falls back to 7 decimals for unknown asset', () => {
    expect(formatAmount('1', 'MYTOKEN')).toBe('1.0000000 MYTOKEN');
  });

  it('returns em-dash for non-finite input', () => {
    expect(formatAmount('abc', 'XLM')).toBe('— XLM');
  });

  it('accepts numeric input', () => {
    expect(formatAmount(2.5, 'XLM')).toBe('2.5000000 XLM');
  });
});

describe('formatAmountValue', () => {
  it('omits asset label', () => {
    expect(formatAmountValue('1', 'XLM')).toBe('1.0000000');
  });
});

describe('isZeroAmount', () => {
  it('returns true for 0', () => expect(isZeroAmount(0)).toBe(true));
  it('returns true for "0"', () => expect(isZeroAmount('0')).toBe(true));
  it('returns false for 1', () => expect(isZeroAmount(1)).toBe(false));
  it('returns false for NaN string', () => expect(isZeroAmount('abc')).toBe(false));
});

describe('formatAmountCompact', () => {
  it('abbreviates millions', () => {
    expect(formatAmountCompact(1_200_000, 'XLM')).toBe('1.20M XLM');
  });

  it('abbreviates thousands', () => {
    expect(formatAmountCompact(1500, 'XLM')).toBe('1.50K XLM');
  });

  it('shows full value under 1000', () => {
    expect(formatAmountCompact(99, 'XLM')).toBe('99.00 XLM');
  });

  it('converts stroops in compact mode', () => {
    expect(formatAmountCompact('10000000000000', 'XLM', true)).toBe('1.00M XLM');
  });
});

describe('formatAmount i128 / BigInt-safe', () => {
  it('formats bigint stroops above MAX_SAFE_INTEGER exactly', () => {
    expect(formatAmount(12345678901234567890123n, 'XLM', true)).toBe('1234567890123456.7890123 XLM');
  });

  it('formats string stroops above MAX_SAFE_INTEGER exactly', () => {
    expect(formatAmount('9007199254740993', 'XLM', true)).toBe('900719925.4740993 XLM');
  });

  it('supports arbitrary token decimals', () => {
    expect(formatAmount('1500000000000000000', 'MYTOKEN', true, { decimals: 18 })).toBe('1.5000000 MYTOKEN');
  });

  it('handles negative stroops', () => {
    expect(formatAmount('-15000000', 'XLM', true)).toBe('-1.5000000 XLM');
  });

  it('keeps number input working', () => {
    expect(formatAmount(0.1, 'XLM')).toBe('0.1000000 XLM');
  });

  it('isZeroAmount accepts bigint', () => {
    expect(isZeroAmount(0n)).toBe(true);
    expect(isZeroAmount(1n)).toBe(false);
  });
});
