$(document).ready(function() {
  $("#signin").click(function() {
    chrome.runtime.sendMessage({
      action: "sign_in"
    }, function(result) {
       });
    return false;
  });
});
