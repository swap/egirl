(function () {
  var pressedKeys = {};

  function setKey(event, status) {
    var code = event.keyCode;
    var key;

    switch (code) {
      case 32:
        key = "SPACE";
        break;
      case 37:
        key = "LEFT";
        break;
      case 38:
        key = "UP";
        break;
      case 39:
        key = "RIGHT";
        break;
      case 40:
        key = "DOWN";
        break;
      case 88:
        key = "JUMP";
        break;
      case 90:
        key = "RUN";
        break;
      default:
        key = String.fromCharCode(code);
    }

    apply(key, status);
  }

  function apply(key, status) {
    key = (key || "").toUpperCase();
    if (status) {
      if (key === "LEFT") pressedKeys.RIGHT = false;
      if (key === "RIGHT") pressedKeys.LEFT = false;
    }
    pressedKeys[key] = status;
  }

  document.addEventListener("keydown", function (e) {
    setKey(e, true);
  });

  document.addEventListener("keyup", function (e) {
    setKey(e, false);
  });

  window.addEventListener("blur", function () {
    pressedKeys = {};
  });

  window.input = {
    isDown: function (key) {
      return pressedKeys[key.toUpperCase()];
    },
    reset: function () {
      pressedKeys = {};
    },
    set: function (key, status) {
      apply(key, status);
    },
  };
})();
