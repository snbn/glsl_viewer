
export function unwrap<T>(v: T | null | undefined): T {
    if (v == null) {
        throw new Error('unwrap is called with null value');
    } else if (typeof v === 'undefined') {
        throw new Error('unwrap is called with undefined value');
    } else {
        return v;
    }
}
