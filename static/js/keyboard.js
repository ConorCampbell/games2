
// helper function:
function ID(elID){
  return document.getElementById(elID)
};

// when the help modal is shown set focus to the play button
helpMessage = document.getElementById("HelpMessage")

if (helpMessage){
    helpMessage.addEventListener('shown.bs.modal', function () {
    document.getElementById("btnHelpResume").focus()
    })
};


function FatGame2(callbacks ={}){

  var parent = this;

  this.form = ID('game')
  this.callbacks = callbacks;

  this.status = function() {
    return ID('game_status').value
  };

  btnHelp = ID('btnHelp')
  btnHelpResume = ID('btnHelpResume')

  // add in the game timer stuff here
  time_allowed = ID('time_allowed').value

  console.log('time allowed', time_allowed)

  this.gameTimer

  if (time_allowed > 0 && (this.status() == "starting" | this.status() == "playing")){

      // all timers count down
      parent.gameTimer = new MyTimer(time_allowed, 0, -1)

      if (this.callbacks.TimeUp){
       parent.gameTimer.callback = this.callbacks.TimeUp // what to do when over ..
      }
      parent.gameTimer.Start(); // Auto start any timer when game playing

  };

  btnHelp.addEventListener("click", function(){
      if(parent.gameTimer != undefined ){
          if (!parent.gameTimer.paused){PauseGame()}
      }
  })

  ID('clock-wrapper').addEventListener("click", PauseGame)

  btnHelpResume.addEventListener("click", ResumeGame)

  function ResumeGame(){

    if(parent.gameTimer != undefined ){

      if (parent.gameTimer.paused){

          parent.gameTimer.Pause() // also start the clock

          // TODO: this is broken
          if (parent.callbacks.Resume){
                  parent.callbacks.Resume()
          };

      };

    }else{
        //no timer
        if (parent.callbacks.Resume){
          parent.callbacks.Resume()
        };
    }

  };

  function PauseGame(){

    if(parent.gameTimer != undefined ){

      parent.gameTimer.Pause()  // also stop the clock

      if (parent.gameTimer.paused){
        if (parent.callbacks.Pause){
           parent.callbacks.Pause()
        };
      }else{
        if (parent.callbacks.Resume){
           parent.callbacks.Resume()
        };
      };

    }else{
      //The game has no timer but may need a pause callback
      if (parent.callbacks.Pause){
           parent.callbacks.Pause()
      };

    };

  };

  QuizID = ID('quiz_id').value

  elTitle = ID('title')

  this.init = function(){

    //console.log ('running game init')

    switch (parent.status()){

      case "win":
        popConfetti(elTitle)
        break;

      case "lose":
        popFart(elTitle)
        break;

      case "starting":

        var seen = JSON.parse(localStorage.getItem("game_instructions_seen")) || [];

        // seen=[]

        if (!Array.isArray(seen)){seen=[]};

        if (seen.length==0 | !seen.includes(QuizID)){
          seen.push(QuizID)
          localStorage.setItem("game_instructions_seen", JSON.stringify(seen));
          btnHelp.click();
        };

        window.scrollTo(0,95)

        break;

      case "playing":
        //TODO could have a playing round processer for start of each ajax round


    };

    if (ID("is_game_over").value){

      ID("PlayAgain").classList.remove('d-none') // show the row of buttons to play again

      if (parent.status() == 'nomore'){
        ID('btnPlayAgain').classList.add('d-none') // unless these games are all gone
      };
    };

  }; //init

  is_game_over = false;

  this.stopGameClock = function(){
        if(myGame.gameTimer) {
          
          myGame.gameTimer.Stop()

          ID("time").value  = myGame.gameTimer.time
          ID("clock-wrapper").classList.add('d-none')

      };
  };


  this.GameOver = function(score, callback){

    console.log("Game over: Posting Score", score)

    if (is_game_over){return} // prevent resubmission

    is_game_over = true; //once only
    parent.stopGameClock();

    ID("hint").style.display = "none";
    ID("gameScore").value = score;

    window.scrollTo(0, 0)

    parent.PostScore(callback);

  };


  this.PostScore = function(callback){

    loading(true);

    var data = new FormData(ID("game"));

    xhttp = new XMLHttpRequest();

    xhttp.responseTpe="json"

    xhttp.onreadystatechange = function() {

        if (this.readyState == 4 && this.status == 200) {

          json = JSON.parse(this.responseText)

          ID("message").innerHTML = json['msg']
          ID("totalGameScore").innerHTML =json['TotalGamesScore']
          ID("is_game_over").value = json['is_game_over']

          if (json['is_game_over']){is_game_over = true}

          ID("game_status").value = json['game_status']

          parent.init();

          not_loading();

          if (callback){callback(json)}; //need to process more stuff from this return

        //todo catch errors ..
        };

    };

    xhttp.open("POST", ID("game").action, true);
    xhttp.send(data);

  };


}; // end of FatGame2


/////////////////////////
// TIMER Class
/////////////////////////

var MyTimer = function(startTime, endTime, increment){

    this.time = parseInt(startTime) || 0
    this.increment = parseInt(increment) || 1
    this.endTime = parseInt(endTime);
    this.paused = false;

    var timer;

    this.callback = {} // caller fills this with their callback

    elClock = ID  ("clock")
    elClockWrapper = ID  ("clock-wrapper")

    this.Start = function(){

      pt = this

      elClockWrapper.classList.remove("d-none"); // show the clock and the puase/play icon
      elClock.innerHTML = pt.time

      pt.timer = setInterval(function(){

        pt.time += pt.increment

        is_time_up = (pt.interval>0) ? (pt.time >= pt.endTime) : (pt.time<= pt.endTime)

        if (is_time_up){
            clearInterval(pt.timer);  //stop the clock
            pt.callback() // raise an event here
        }else{
            elClock.innerHTML = pt.time
            if (pt.time<10){elClock.classList.add('red','blob')}
          }

        }, 1000)

    }

    this.Stop = function(){
      clearInterval(pt.timer);  //stop the clock
    }


    btnPauseClock =  ID ("btnPauseClock")

    this.Pause = function(){
        // ***************
        // Pause a game
        // set the game board to blank and switch the pause/ play icons
        // ***************

      if (!pt.paused){

        clearInterval(pt.timer);  //stop the clock

        pt.paused=true;

        ID("game-board").style.transition = "opacity 0.5s";
        ID("game-board").style.opacity = 0;

        //change pause icon to play
        btnPauseClock.classList.remove  ('bi',  'bi-pause-fill', 'text-danger')
        btnPauseClock.classList.add ('bi', 'bi-play', 'text-success')

      }else{

        pt.paused=false;

        ID("game-board").style.transition = "opacity 0.5s";
        ID("game-board").style.opacity = 1;

        btnPauseClock.classList.remove   ('bi', 'bi-play', 'text-success')
        btnPauseClock.classList.add  ('bi',  'bi-pause-fill', 'text-danger')

        pt.Start()

      }

    };


}; // End of Timer class

/////////////////////////
/////////////////////////
/////////////////////////

/////////////////////////
// Typewriter Effect
/////////////////////////

runTypewriter = function(txt){

  var q_text_div = ID("hint-text");

  if (q_text_div) {
    var iTextPos = 0;

    q_text_div.textContent = ''

    if (!txt){
      txt = q_text_div.getAttribute("data-content");
    }

    var typingSpeed = 20;
    function typeWriter() {
      if (iTextPos < txt.length) {
        q_text_div.textContent = q_text_div.textContent + txt[iTextPos];
        iTextPos++;
        setTimeout(typeWriter, typingSpeed);
      }
    }
    typeWriter();
  };

}

runTypewriter()

////////////////////////////////////
// Keyboard Class
////////////////////////////////////
function Keyboard(id = "keyboard", keyEvent, enabled = true) {

  this.el = ID(id);
  this.keys = this.el.querySelectorAll("button");
  this.callback = keyEvent;

  this.enable(enabled);

  this.audio

  this.clickSound = function (){
    if (is_sound_allowed == "true"){
      if (!this.audio){
          this.audio   = new Audio("/static/sound/click.wav")
      }
      this.audio.play();
    }
  };

  this.keys.forEach(
    button => {

      button.addEventListener("click", this.callback);

      button.addEventListener("click", this.clickSound)

      button.addEventListener("mousedown", event => event.preventDefault());
    }
  );}

Keyboard.prototype.enable = function(bool){
  if(bool){
    this['el'].classList.remove('disabled')
  }else{
    this['el'].classList.add('disabled')
  }
  this.keys.forEach(
    button => {
      button.removeAttribute("disabled");
    }
  );
};


Keyboard.prototype.vowels = function(bool) {
  this.keys.forEach(function(key) {
    const isVowel = ["A", "E", "I", "O", "U"].includes(key.dataset.key);
    if (bool ? isVowel : !isVowel) {
      key.removeAttribute("disabled");
    } else {
      key.setAttribute("disabled", true);
    }
  });
};


Keyboard.prototype.scorekeysMurdle = function(keyscores) {
  const keys = document.querySelectorAll("#keyboard button");
  keys.forEach(function(key) {
    const letterScore = keyscores[key.getAttribute("data-key").toLowerCase()];
    if (letterScore) {
      key.classList.add(letterScore);
    }
  });
};

Keyboard.prototype.scorekeys = function(guesses, answer, disable = false) {
  this.keys.forEach(function(key) {
    const thisletter = key.getAttribute("data-key").toLowerCase();
    if (guesses.includes(thisletter)) {
      key.setAttribute("disabled", disable);
      key.classList.add(answer.includes(thisletter) ? "O" : "X");
    }
  });
};