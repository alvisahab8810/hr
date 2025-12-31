// utils/ist.js
export function istNow() {
// returns current date object in IST (JS Date is always UTC internally, but we create the IST offset time)
const now = new Date();
const utc = now.getTime() + now.getTimezoneOffset() * 60000;
const offset = 5.5 * 60 * 60 * 1000; // IST = UTC+5:30
return new Date(utc + offset);
}


export function istDateString(date = new Date()) {
// returns YYYY-MM-DD for IST
const d = new Date(date);
const utc = d.getTime() + d.getTimezoneOffset() * 60000;
const ist = new Date(utc + 5.5 * 3600000);
const yyyy = ist.getFullYear();
const mm = String(ist.getMonth() + 1).padStart(2, "0");
const dd = String(ist.getDate()).padStart(2, "0");
return `${yyyy}-${mm}-${dd}`;
}


export function istDateAt(hour = 10, minute = 0) {
const now = new Date();
const utc = now.getTime() + now.getTimezoneOffset() * 60000;
const ist = new Date(utc + 5.5 * 3600000);
ist.setHours(hour, minute, 0, 0);
return ist;
}