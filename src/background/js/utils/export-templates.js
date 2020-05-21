/* Export templates
 */

function downloadString(text, fileType, fileName) {
    var blob = new Blob([text], { type: fileType });

    var a = document.createElement('a');
    a.download = fileName;
    a.href = URL.createObjectURL(blob);
    a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(a.href); }, 1500);
}

function generateCsv (arr = []) {
    // header
    if (!arr.length) {
        return '';
    }

    var lines = [];
    var columns = Object.keys(arr[0]);
    lines.push(columns.join(','));

    arr.forEach((item) => {
        var row = [];
        columns.forEach((key) => {
            var content = (item[key] || '').replace(/"/g, '""');
            if (content) {
                content = `"${content}"`;
            }
            row.push(content);
        });

        lines.push(row.join(','));
    });

    return lines.join('\r\n');
}

export default function (templates = []) {
    var now = new Date();
    var filename = 'gorgias-templates-' + now.toISOString() + '.csv' ;

    // format the data
    var exportTemplates = templates.map((item) => {
        return {
            id: item.remote_id || '',
            title: item.title || '',
            shortcut: item.shortcut || '',
            subject: item.subject || '',
            tags: item.tags || '',
            cc: item.cc || '',
            bcc: item.bcc || '',
            to: item.to || '',
            body: item.body || '',
        };
    });

    var csv = generateCsv(exportTemplates);
    return downloadString(csv, 'text/csv', filename);
}
