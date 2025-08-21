function popFart(e) {
  //trigger some fail sound
  var sounds = [
    "static/sound/fail1.mp3",
    "static/sound/fail4.mp3",
    "static/sound/fail6.mp3",
    "static/sound/fail7.mp3",
  ];
  var sound = sounds[Math.floor(Math.random() * sounds.length)];

  if (is_sound_allowed == "true") {
    new Audio(sound).play();
  }
}

//Exploding Particles ..
function popConfetti(e) {
  //trigger some confetti
console.log('showing confetti')
  // pick a win sound
  var sounds = [
    "static/sound/win.mp3",
    "static/sound/win1.mp3",
    "static/sound/win3.mp3",
    "static/sound/win4.mp3",
  ];
  var sound = sounds[Math.floor(Math.random() * sounds.length)];

  if (is_sound_allowed == "true") {
    new Audio(sound).play();
  }

  let amount = 35;
  const bbox = e.parentNode.getBoundingClientRect();

  const x = bbox.left + bbox.width / 2;
  const y = bbox.top + bbox.height / 2;

  //choose a random effect
  //var effects = ['square','emoji','ff','mario','shadow','line'];

  var effects = ["square", "emoji", "shadow", "star", "star", "emoji"];
  var effect = effects[Math.floor(Math.random() * effects.length)];

  for (let i = 0; i < amount; i++) {
    createParticle(x, y, effect);
  }
}

// function popStars (e, rating) {

//     //trigger some stars
//     const bbox = e.parentNode.getBoundingClientRect();
//     const x = bbox.left + bbox.width / 2;
//     const y = bbox.top + bbox.height / 2;

//     // Calc star type and number of stars
//     if (rating == -1){
//       effect = 'question';
//       amount = 5;
//     }else{
//       effect = 'star';
//       amount = parseInt(parseInt(rating) ** 2.7 + 2);
//     }

//     console.log("creating stars", amount, effect);

//     for (let i = 0; i < amount; i++) {
//       createParticle(x, y, effect);
//     };

// };


function popStars(e, rating) {
  const bbox = e.parentNode.getBoundingClientRect();
  const x = bbox.left + bbox.width / 2;
  const y = bbox.top + bbox.height / 2;

  let effect, amount;
  if (rating == -1) {
    effect = "question";
    amount = 5;
  } else {
    effect = "star";
    amount = Math.ceil(Math.pow(rating, 2.7) + 2);
  }

  console.log("Creating stars", amount, effect);

  let i = 0;
  const batchSize = 10; // Number of particles to create per batch

  function createBatch() {
    const end = Math.min(i + batchSize, amount);
    for (; i < end; i++) {
      createParticle(x, y, effect);
    }
    if (i < amount) {
      requestAnimationFrame(createBatch); // Schedule next batch
    }
  }
  createBatch(); // Start the process
};


// function createParticle(x, y, type) {
//   const fragment = document.createDocumentFragment();
//   const particle = document.createElement('particle');
//   fragment.appendChild(particle);

//   // Rest of your code for styling the particle...
//   particle.style.width = `${width}px`;
//   particle.style.height = `${height}px`;
//   particle.style.zIndex = 1000;

//   document.body.appendChild(fragment);
// }


function createParticle(x, y, type) {
  const particle = document.createElement("particle");
  document.body.appendChild(particle);
  let width = Math.floor(Math.random() * 30 + 8);
  let height = width;
  let destinationX = (Math.random() - 0.5) * 300;
  let destinationY = (Math.random() - 0.5) * 300;
  let rotation = Math.random() * 520;
  let delay = Math.random() * 200;

  // console.log("fireworks");

  switch (type) {
    case "square":
      particle.style.background = `hsl(${Math.random() * 90 + 270}, 70%, 60%)`;
      particle.style.border = "1px solid white";
      break;

    case "question":
      particle.innerHTML = ["❓", "❔"][Math.floor(Math.random() * 2)];
      particle.style.fontSize = `${Math.random() * 24 + 10}px`;
      particle.style.border = "2px solid orange";
      particle.style.borderRadius = "50%";
      width = height = "auto";
      break;

    case "star":
      particle.innerHTML = ["⭐", "🌟", "🤩", "✨"][
        Math.floor(Math.random() * 4)
      ];
      particle.style.fontSize = `${Math.random() * 24 + 10}px`;
      width = height = "auto";
      break;

    case "emoji":
      particle.innerHTML = ["❤", "🧡", "💛", "💚", "💙", "💜", "🤎"][
        Math.floor(Math.random() * 7)
      ];
      particle.style.fontSize = `${Math.random() * 24 + 10}px`;
      width = height = "auto";
      break;

    // case 'ff':

    //   particle.style.backgroundImage = "url('/static//img//icons//logo.png')";

    //   particle.style.border = '1px solid white';
    //   break;

    // case 'mario':
    //   particle.style.backgroundImage = "url('https://s3-us-west-2.amazonaws.com//s.cdpn.io//127738//mario-face.png')";
    //   break;

    case "shadow":
      var color = `hsl(${Math.random() * 90 + 90}, 70%, 50%)`;
      particle.style.boxShadow = `0 0 ${Math.floor(
        Math.random() * 10 + 10
      )}px ${color}`;
      particle.style.background = color;
      particle.style.borderRadius = "50%";
      width = height = Math.random() * 5 + 4;
      break;

    case "line":
      var color = `hsl(${Math.random() * 90 + 90}, 70%, 50%)`;
      particle.style.background = "black";
      height = 1;
      rotation += 1000;
      delay = Math.random() * 1000;
      break;

  }

  particle.style.width = `${width}px`;
  particle.style.height = `${height}px`;
  particle.style.zIndex = 1000;

  const animation = particle.animate(
    [
      {
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(0deg)`,
        opacity: 1,
      },
      {
        transform: `translate(-50%, -50%) translate(${x + destinationX}px, ${
          y + destinationY
        }px) rotate(${rotation}deg)`,
        opacity: 0,
      },
    ],
    {
      duration: Math.random() * 1000 + 2000,
      easing: "cubic-bezier(0, .9, .57, 1)",
      delay: delay,
    }
  );
  animation.onfinish = removeParticle;
}

function removeParticle(e) {
  e.srcElement.effect.target.remove();
}
