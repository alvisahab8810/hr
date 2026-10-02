const fs = require('fs');
const F = 'components/MailCompose.js';
let t = fs.readFileSync(F, 'utf8');
const nl = t.includes('\r\n') ? '\r\n' : '\n';
const sub = (a, b, n) => {
  const A = a.split('\n').join(nl), B = b.split('\n').join(nl);
  if (!t.includes(A)) { console.log('MISS', n); process.exit(1); }
  t = t.replace(A, B);
};
sub(`import toast from "react-hot-toast";`,
    `import toast from "react-hot-toast";
import MailAttach from "@/components/MailAttach";`, 'import');
sub(`  const [preview, setPreview] = useState(false);`,
    `  const [preview, setPreview] = useState(false);
  const [files, setFiles] = useState([]);`, 'state');
sub(`        body: JSON.stringify({ kind, markSent: !!markSent, ...(extra || {}), ...f }),`,
    `        body: JSON.stringify({ kind, markSent: !!markSent, ...(extra || {}), ...f, files }),`, 'send');
sub(`                </div>
              ) : null}
            </>
          )}`,
    `                </div>
              ) : null}

              <MailAttach files={files} setFiles={setFiles} />
            </>
          )}`, 'ui');
fs.writeFileSync(F, t);
console.log('ok');
