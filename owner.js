// owner.js
let map;
let marker;
let currentLocation = null;

document.addEventListener('DOMContentLoaded', function() {
  // Initialize map
  initMap();
  
  // Handle room form submission
  document.getElementById('roomForm').addEventListener('submit', addRoom);
  
  // Locate me button
  document.getElementById('locateMe').addEventListener('click', function() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        if (marker) {
          map.removeLayer(marker);
        }
        
        marker = L.marker([currentLocation.lat, currentLocation.lng]).addTo(map);
        map.setView([currentLocation.lat, currentLocation.lng], 15);
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  });
  
  // Image preview
  document.getElementById('roomPhotos').addEventListener('change', function(e) {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    
    for (let file of e.target.files) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.height = '100px';
        preview.appendChild(img);
      }
      reader.readAsDataURL(file);
    }
  });
  
  // Load owner's rooms
  loadOwnerRooms();
  
  // Load transactions
  loadTransactions();
  
  // Support issue submission
  document.getElementById('submitIssue').addEventListener('click', submitIssue);
});

function initMap() {
  map = L.map('map').setView([20.5937, 78.9629], 5); // Default to India view
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  
  map.on('click', function(e) {
    currentLocation = {
      lat: e.latlng.lat,
      lng: e.latlng.lng
    };
    
    if (marker) {
      map.removeLayer(marker);
    }
    
    marker = L.marker([currentLocation.lat, currentLocation.lng]).addTo(map);
  });
}

async function addRoom(e) {
  e.preventDefault();
  
  if (!currentLocation) {
    alert("Please mark the location on the map");
    return;
  }
  
  const roomType = document.getElementById('roomType').value;
  const bathroomType = document.getElementById('bathroomType').value;
  const price = document.getElementById('roomPrice').value;
  const description = document.getElementById('roomDescription').value;
  const files = document.getElementById('roomPhotos').files;
  
  const ownerId = auth.currentUser.uid;
  const roomData = {
    ownerId,
    type: roomType,
    bathroom: bathroomType,
    price: parseFloat(price),
    description,
    location: currentLocation,
    isAvailable: true,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  // Upload images first
  const photoUrls = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const storageRef = storage.ref(`rooms/${ownerId}/${Date.now()}_${file.name}`);
    const snapshot = await storageRef.put(file);
    const url = await snapshot.ref.getDownloadURL();
    photoUrls.push(url);
  }
  
  roomData.photos = photoUrls;
  
  // Add room to Firestore
  db.collection('rooms').add(roomData)
    .then(() => {
      alert("Room added successfully!");
      document.getElementById('roomForm').reset();
      document.getElementById('imagePreview').innerHTML = '';
      loadOwnerRooms();
    })
    .catch(error => {
      console.error("Error adding room: ", error);
      alert("Error adding room. Please try again.");
    });
}

function loadOwnerRooms() {
  const ownerId = auth.currentUser.uid;
  const roomsList = document.getElementById('roomsList');
  roomsList.innerHTML = '';
  
  db.collection('rooms')
    .where('ownerId', '==', ownerId)
    .onSnapshot(snapshot => {
      snapshot.forEach(doc => {
        const room = doc.data();
        const div = document.createElement('div');
        div.className = 'room-item';
        div.innerHTML = `
          <div class="room-images">
            ${room.photos.map(photo => `<img src="${photo}" alt="Room photo">`).join('')}
          </div>
          <div class="room-details">
            <h3>${room.type === 'single' ? 'Single Room' : 'Shared Room'} - ₹${room.price}/month</h3>
            <p>Bathroom: ${room.bathroom === 'attached' ? 'Attached' : 'Separate'}</p>
            <p>Status: ${room.isAvailable ? 'Available' : 'Occupied'}</p>
            <button onclick="toggleRoomAvailability('${doc.id}', ${!room.isAvailable})">
              Mark as ${room.isAvailable ? 'Occupied' : 'Available'}
            </button>
          </div>
        `;
        roomsList.appendChild(div);
      });
    });
}

function toggleRoomAvailability(roomId, newStatus) {
  db.collection('rooms').doc(roomId).update({
    isAvailable: newStatus
  });
}

function loadTransactions() {
  const ownerId = auth.currentUser.uid;
  const transactionsList = document.getElementById('transactionsList');
  transactionsList.innerHTML = '';
  
  db.collection('transactions')
    .where('ownerId', '==', ownerId)
    .orderBy('date', 'desc')
    .onSnapshot(snapshot => {
      snapshot.forEach(doc => {
        const transaction = doc.data();
        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.innerHTML = `
          <p>Room ID: ${transaction.roomId}</p>
          <p>Amount: ₹${transaction.amount}</p>
          <p>Commission: ₹${transaction.commission}</p>
          <p>Status: ${transaction.status}</p>
          <p>Date: ${new Date(transaction.date).toLocaleDateString()}</p>
        `;
        transactionsList.appendChild(div);
      });
    });
}

function submitIssue() {
  const message = document.getElementById('issueMessage').value;
  if (!message) {
    alert("Please describe your issue");
    return;
  }
  
  const issue = {
    userId: auth.currentUser.uid,
    type: "owner",
    message,
    status: "open",
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  db.collection('issues').add(issue)
    .then(() => {
      alert("Issue submitted successfully. We'll contact you soon.");
      document.getElementById('issueMessage').value = '';
    })
    .catch(error => {
      console.error("Error submitting issue: ", error);
      alert("Error submitting issue. Please try again.");
    });
    // ================== COMMISSION SYSTEM ================== //

// 1. Dropdown mein rented rooms dikhao
function loadRentedRooms() {
  const ownerId = auth.currentUser.uid;
  const dropdown = document.getElementById('rentedRoomsList');
  
  db.collection('rooms')
    .where('ownerId', '==', ownerId)
    .where('isAvailable', '==', false)
    .onSnapshot(snapshot => {
      dropdown.innerHTML = '<option value="">-- Select Rented Room --</option>';
      snapshot.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = `Room ${doc.id.substring(0, 5)}... (₹${doc.data().price}/month)`;
        dropdown.appendChild(option);
      });
    });
}

// 2. Rent payment log karo (5% commission calculate hoga)
document.getElementById('logRentBtn').addEventListener('click', function() {
  const roomId = document.getElementById('rentedRoomsList').value;
  const amount = parseFloat(document.getElementById('rentAmount').value);
  
  if (!roomId || isNaN(amount)) {
    alert("Please select a room and enter valid amount");
    return;
  }

  const commission = amount * 0.05; // 5%
  
  db.collection('rooms').doc(roomId).update({
    payments: firebase.firestore.FieldValue.arrayUnion({
      month: new Date().toLocaleString('default', { month: 'short' }),
      amount: amount,
      commission: commission,
      status: "unpaid",
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }),
    pendingCommission: firebase.firestore.FieldValue.increment(commission)
  }).then(() => {
    alert(`✅ Payment logged!\nYou owe admin: ₹${commission}`);
    document.getElementById('rentAmount').value = '';
  });
});

// 3. Pending commissions dikhao
function loadUnpaidCommissions() {
  const ownerId = auth.currentUser.uid;
  const listDiv = document.getElementById('commissionList');
  const totalDueSpan = document.getElementById('totalDue');
  let totalDue = 0;

  db.collection('rooms')
    .where('ownerId', '==', ownerId)
    .where('pendingCommission', '>', 0)
    .onSnapshot(snapshot => {
      listDiv.innerHTML = '';
      totalDue = 0;
      
      if (snapshot.empty) {
        listDiv.innerHTML = '<p>No pending commissions</p>';
        totalDueSpan.textContent = 'Total Due: ₹0';
        return;
      }

      snapshot.forEach(doc => {
        totalDue += doc.data().pendingCommission;
        listDiv.innerHTML += `
          <div style="background: white; padding: 10px; margin-bottom: 5px; border-radius: 5px;">
            <strong>Room ${doc.id.substring(0, 5)}...</strong>
            <p>Due: ₹${doc.data().pendingCommission}</p>
          </div>
        `;
      });

      totalDueSpan.textContent = `Total Due: ₹${totalDue}`;
    });
}

// 4. Owner commission pay karega
document.getElementById('payCommissionBtn').addEventListener('click', function() {
  const ownerId = auth.currentUser.uid;
  
  if (!confirm("Kya aapne commission admin ko bhej diya hai?")) return;

  db.collection('rooms')
    .where('ownerId', '==', ownerId)
    .where('pendingCommission', '>', 0)
    .get()
    .then(snapshot => {
      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.update(doc.ref, { 
          pendingCommission: 0,
          'payments': doc.data().payments.map(payment => 
            payment.status === "unpaid" ? { ...payment, status: "paid" } : payment
          )
        });
      });
      return batch.commit();
    })
    .then(() => alert("Commission marked as paid! Thank you."));
});

// Initialize system
loadRentedRooms();
loadUnpaidCommissions();
}