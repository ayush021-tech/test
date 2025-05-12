// admin.js
document.addEventListener('DOMContentLoaded', function() {
  // Special phone authentication for admin
  if (!auth.currentUser || auth.currentUser.phoneNumber !== "+919098154477") {
    window.location.href = "index.html";
  }

  // Commission toggle
  const commissionToggle = document.getElementById('commissionToggle');
  const commissionStatus = document.getElementById('commissionStatus');
  
  // Load commission status
  db.collection('settings').doc('commission').get()
    .then(doc => {
      if (doc.exists) {
        commissionToggle.checked = doc.data().enabled;
        commissionStatus.textContent = doc.data().enabled ? "Enabled" : "Disabled";
      }
    });

  commissionToggle.addEventListener('change', function() {
    db.collection('settings').doc('commission').set({
      enabled: this.checked
    });
    commissionStatus.textContent = this.checked ? "Enabled" : "Disabled";
  });

  // Load pending commissions
  db.collection('transactions')
    .where('status', '==', 'pending')
    .onSnapshot(snapshot => {
      const container = document.getElementById('pendingCommissions');
      container.innerHTML = '';
      
      snapshot.forEach(doc => {
        const transaction = doc.data();
        const div = document.createElement('div');
        div.className = 'commission-item';
        div.innerHTML = `
          <p>Room ID: ${transaction.roomId}</p>
          <p>Amount: ₹${transaction.amount}</p>
          <p>Commission (5%): ₹${transaction.commission}</p>
          <p>Owner: ${transaction.ownerId}</p>
          <button onclick="markAsPaid('${doc.id}')">Mark as Paid</button>
        `;
        container.appendChild(div);
      });
    });

  // Load reported issues
  db.collection('issues')
    .where('status', '==', 'open')
    .onSnapshot(snapshot => {
      const container = document.getElementById('reportedIssues');
      container.innerHTML = '<h3>Open Issues</h3>';
      
      snapshot.forEach(doc => {
        const issue = doc.data();
        const div = document.createElement('div');
        div.className = 'issue-item';
        div.innerHTML = `
          <p>From: ${issue.type} (${issue.userId})</p>
          <p>Message: ${issue.message}</p>
          <p>Time: ${new Date(issue.timestamp).toLocaleString()}</p>
          <button onclick="resolveIssue('${doc.id}')">Mark as Resolved</button>
        `;
        container.appendChild(div);
      });
    });
});

function markAsPaid(id) {
  db.collection('transactions').doc(id).update({
    status: 'paid'
  });
}

function resolveIssue(id) {
  db.collection('issues').doc(id).update({
    status: 'resolved'
  });
  // Commission system ON/OFF
const commissionToggle = document.getElementById('commissionToggle');

// Firebase se status load karo
db.collection('settings').doc('commission').onSnapshot(doc => {
  if (doc.exists) {
    commissionToggle.checked = doc.data().enabled;
    document.getElementById('commissionStatus').textContent = 
      doc.data().enabled ? "ACTIVE (5%)" : "INACTIVE";
  }
});

// Toggle commission system
commissionToggle.addEventListener('change', function() {
  db.collection('settings').doc('commission').set({
    enabled: this.checked
  });
});
}