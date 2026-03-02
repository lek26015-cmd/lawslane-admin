const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src/app');
let changedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // Replace "/admin/" with "/"
    content = content.replace(/(["'`])\/admin\//g, '$1/');

    // Replace "/admin" with "/"
    content = content.replace(/(["'`])\/admin(["'`])/g, '$1/$2');

    if (content !== original) {
        fs.writeFileSync(file, content);
        changedCount++;
        console.log('Updated:', file);
    }
});

console.log('Total files updated:', changedCount);
