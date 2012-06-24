$(function() {
    //Doing this quick and dirty style, rather than with Backbone. should switch to Backbone or other MVC before building any more

    //View garments
    if($("#garments").length) {
        $.ajax({
           url : "api/garments",
           success : function(data){
               data.forEach(function(garment){
                   //Should obviously use a template for this later
                  $("#garments").append('<img class="articlePhoto" src="api/garments/' + garment._id + '/image" alt="Article"/>'); 
               });
           } 
        });
    }

    //Add garment

    //Alerts connection
});
