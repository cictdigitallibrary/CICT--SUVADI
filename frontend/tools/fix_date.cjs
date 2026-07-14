const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminPortal.jsx', 'utf8');

const target = `                                    {item.upload_date 
                                      ? new Date(item.upload_date.replace(' ', 'T')).toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) 
                                      : '-'}`;

const replacement = `                                    {item.upload_date 
                                      ? (() => {
                                          const d = new Date(item.upload_date.replace(' ', 'T'));
                                          const day = String(d.getDate()).padStart(2, '0');
                                          const month = String(d.getMonth() + 1).padStart(2, '0');
                                          const year = d.getFullYear();
                                          let hours = d.getHours();
                                          const minutes = String(d.getMinutes()).padStart(2, '0');
                                          const ampm = hours >= 12 ? 'PM' : 'AM';
                                          hours = hours % 12;
                                          hours = hours ? hours : 12;
                                          const strTime = String(hours).padStart(2, '0') + ':' + minutes + ' ' + ampm;
                                          return \`\${day}-\${month}-\${year} \${strTime}\`;
                                        })()
                                      : '-'}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/pages/AdminPortal.jsx', code);
