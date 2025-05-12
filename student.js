// student.js
let map;
let markers = [];

document.addEventListener('DOMContentLoaded', function() {
  // Initialize map
  initMap();
  
  // Load all available rooms initially
  loadRooms();
  
  // Search button click
  document.getElementById('searchBtn').addEventListener('click', loadRooms);
  
  // Support issue submission
  document.getElementById('submitStudentIssue').addEventListener('click', submitStudentIssue);
});

function initMap() {
  map = L.map('map').setView([20.5937, 78.9629], 5); // Default to India view
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
}

function loadRooms() {
  const roomType = document.getElementById('roomTypeFilter').value;
  const bathroomType = document.getElementById('bathroomFilter').value;
  const maxPrice = document.getElementById('maxPrice').value;
  
  let query = db.collection('rooms').where('isAvailable', '==', true);
  
  if (roomType) {
    query = query.where('type', '==', roomType);
  }
  
  if (bathroomType) {
    query = query.where('bathroom', '==', bathroomType);
  }
  
  if (maxPrice) {
    query = query.where('price', '<=', parseFloat(maxPrice));
  }
  
  const roomsList = document.getElementById('roomsList');
  roomsList.innerHTML = '';
  
  // Clear existing markers
  markers.forEach(marker => map.removeLayer(marker));
  markers = [];
  
  query.get().then(snapshot => {
    if (snapshot.empty) {
      roomsList.innerHTML = '<p>No rooms found matching your criteria.</p>';
      return;
    }
    
    snapshot.forEach(doc => {
      const room = doc.data();
      const div = document.createElement('div');
      div.className = 'room-item';
      div.innerHTML = `
        <div class="room-images">
          ${room.photos.slice(0, 1).map(photo => `<img src="${photo}" alt="Room photo">`).join('')}
        </div>
        <div class="room-details">
          <h3>${room.type === 'single' ? 'Single Room' : 'Shared Room'} - ₹${room.price}/month</h3>
          <p>Bathroom: ${room.bathroom === 'attached' ? 'Attached' : 'Separate'}</p>
          <p>Location: <a href="#" onclick="focusOnMap(${room.location.lat}, ${room.location.lng})">View on Map</a></p>
          <button onclick="contactOwner('${room.ownerId}', '${doc.id}')">Contact Owner</button>
          <button onclick="showRoomDetails('${doc.id}')">View Details</button>
        </div>
      `;
      roomsList.appendChild(div);
      
      // Add marker to map
      const marker = L.marker([room.location.lat, room.location.lng])
        .addTo(map)
        .bindPopup(`<b>₹${room.price}/month</b><br>${room.type} room`);
      
      markers.push(marker);
    });
    
    // Fit map to show all markers
    if (markers.length > 0) {
      const group = new L.featureGroup(markers);
      map.fitBounds(group.getBounds());
    }
  });
}

function focusOnMap(lat, lng) {
  map.setView([lat, lng], 15);
}

function contactOwner(ownerId, roomId) {
  // In a real app, you would implement actual contact functionality
  // For now, we'll just show a popup with the room ID
  alert(`You would now contact the owner of room ${roomId}. In a full implementation, this would show the owner's contact details or open a chat.`);
}

function showRoomDetails(roomId) {
  db.collection('rooms').doc(roomId).get().then(doc => {
    if (doc.exists) {
      const room = doc.data();
      const detailsHtml = `
        <div class="room-details-modal">
          <h2>${room.type === 'single' ? 'Single Room' : 'Shared Room'} - ₹${room.price}/month</h2>
          <div class="room-gallery">
            ${room.photos.map(photo => `<img src="${photo}" alt="Room photo">`).join('')}
          </div>
          <p><strong>Bathroom:</strong> ${room.bathroom === 'attached' ? 'Attached' : 'Separate'}</p>
          <p><strong>Description:</strong> ${room.description || 'No description provided'}</p>
          <p><strong>Location:</strong> <a href="https://www.google.com/maps?q=${room.location.lat},${room.location.lng}" target="_blank">Open in Google Maps</a></p>
          <button onclick="contactOwner('${room.ownerId}', '${roomId}')">Contact Owner</button>
          <button onclick="closeModal()">Close</button>
        </div>
      `;
      
      const modal = document.createElement('div');
      modal.id = 'roomDetailsModal';
      modal.innerHTML = detailsHtml;
      document.body.appendChild(modal);
    }
  });
}

function closeModal() {
  const modal = document.getElementById('roomDetailsModal');
  if (modal) {
    modal.remove();
  }
}

function submitStudentIssue() {
  const message = document.getElementById('studentIssue').value;
  if (!message) {
    alert("Please describe your issue");
    return;
  }
  
  const issue = {
    userId: auth.currentUser.uid,
    type: "student",
    message,
    status: "open",
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  db.collection('issues').add(issue)
    .then(() => {
      alert("Issue submitted successfully. We'll contact you soon.");
      document.getElementById('studentIssue').value = '';
    })
    .catch(error => {
      console.error("Error submitting issue: ", error);
      alert("Error submitting issue. Please try again.");
    });
}