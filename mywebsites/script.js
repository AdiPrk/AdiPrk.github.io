let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

function openTab(evt, tabName) {
  var i, tabcontent, tablinks;

  tabcontent = document.getElementsByClassName("content-table");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

function render(){
	canvas.width = innerWidth;
	canvas.height = innerHeight;
  ctx.clearRect(0, 0, innerWidth, innerHeight);

  requestAnimationFrame(render);
}
requestAnimationFrame(render);