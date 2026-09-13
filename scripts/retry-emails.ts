import {processEmails} from '../lib/email';
processEmails(100).then(console.log).catch(()=>{console.error('Email retry failed');process.exitCode=1;});
