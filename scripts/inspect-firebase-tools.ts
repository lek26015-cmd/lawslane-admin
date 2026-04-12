
// @ts-expect-error missing type definitions
import * as fb from 'firebase-tools';
console.log(Object.keys(fb));
if ((fb as any).auth) {
    console.log('auth exports:', Object.keys((fb as any).auth));
}
