
export function unwrap<T>(v: T | null): T {
    if (v == null) {
        throw new Error('unwrap is called with null value');
    } else {
        return v;
    }
}
