$(function() {
    //Doing this quick and dirty style, rather than with Backbone. should switch to Backbone or other MVC before building any more

    //View garments
    if($("#garments").length) {
        $.ajax({
            url : "api/garments",
            success : function(data) {
                data.forEach(function(garment) {
                    //Should obviously use a template for this later
                    $("#garments").append('<img class="articlePhoto" src="api/garments/' + garment._id + '/image" alt="Article"/>');
                });
            }
        });
    }

    //Add garment
    if($(".addGarment").length) {
        //Bind file drops
        $(".addGarment > .articlePlaceholder").on("dragover", function(e) {
            e.stopPropagation();
            e.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = "copy";
        });
        $(".addGarment > .articlePlaceholder").on("drop", function(e) {
            e.stopPropagation();
            e.preventDefault();

            var file = e.originalEvent.dataTransfer.files[0];
            var reader = new FileReader();
            reader.onload = $.proxy(function(e) {
                $(this).css("background-image", "url(" + e.target.result + ")");
            }, this);

            reader.readAsDataURL(file);
        });
        //Eventually we need to allow manual cropping/resizing of the image

        $("#finished").on("click", function(e) {
            e.stopPropagation();
            e.preventDefault();
            $(".addGarment").each(function(i, add) {
                $add = $(add);
                var dataURL = (/url\(data:image\/(\w+);base64,(.*)\)/).exec($add.find(".articlePlaceholder").css("background-image"));
                if(!dataURL) return; //No image placed here
                var imageMime = dataURL[1];
                var imageData = dataURL[2];
                $.ajax({
                    url: "api/garments",
                    type : "POST",
                    dataType : "json",
                    data : {item: $add.find("#setcategory").val(), color: $add.find("#setcolor").val(), style : $add.find("#setstyle").val(), image : imageData},
                    success : $.proxy(function(data){
                        console.log(data);
                        $(this).find(".articlePlaceholder").css("background-image", "");
                        $(this).find("#setcategory").val("");
                        $(this).find("#setcolor").val("");
                        $(this).find("#setstyle").val("");
                    },add)
                });
            });
        });
    }

    //Alerts connection
});
