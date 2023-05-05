async function taskUpdated(taskName,status) {
    return fetch('/task-updated', {
      method: 'post',
      body: JSON.stringify({name: taskName, status: status}),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    .then(checkStatus)
    .then(function(response) {
      if(response.ok) {
        console.log('Task updated');
        if(status == "Restored"){location.reload()};
        return;
      }
      throw new Error('Request failed.');
    })
    .catch(function(error) {
      console.log(error);
    });
  }

  async function taskRemoved(taskName) {
    return fetch('/task-removed', {
      method: 'post',
      body: JSON.stringify({name: taskName}),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    .then(checkStatus)
    .then(function(response) {
      if(response.ok) {
        console.log('Task removed');
        location.reload();
        return;
      }
      throw new Error('Request failed.');
    })
    .catch(function(error) {
      console.log(error);
    });
  }

  function checkStatus(response) {
    if (response.status >= 200 && response.status < 300) {
      return response
    } else {
      var error = new Error(response.statusText)
      error.response = response
      throw error
    }
  }

function checkboxChanged(name,id) {
  console.log("Changed")
  var checkbox = document.getElementById(id);
  console.log(checkbox.checked);
    if (checkbox.checked) {
      taskUpdated(name,"Done");
    } else {
      taskUpdated(name,"To do");
    }
}