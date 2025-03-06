class PhotosController < ApplicationController
  def create
    @photo = if params[:photo].present?
              Photo.new(photo_params)
            else
              # Legacy support for old upload mechanism
              Photo.new(image: params["Filedata"])
            end
    
    if @photo.save
      respond_to do |format|
        # JSON response for AJAX requests from comment form
        format.json do
          render json: {
            id: @photo.id,
            url: @photo.image.url,
            medium_url: @photo.image.medium.url,
            small_url: @photo.image.small.url,
            markdown_link: md_url(@photo.image.url)
          }
        end
        
        # Support for legacy plain text response
        format.html { render plain: md_url(@photo.image.url) }
      end
    else
      respond_to do |format|
        format.json { render json: { error: @photo.errors.full_messages.join(', ') }, status: :unprocessable_entity }
        format.html { render plain: "Upload failed: #{@photo.errors.full_messages.join(', ')}", status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @photo = Photo.find(params[:id])
    
    if @photo.destroy
      respond_to do |format|
        format.json { render json: { success: true }, status: :ok }
        format.html { redirect_back fallback_location: root_path, notice: "Image deleted successfully" }
      end
    else
      respond_to do |format|
        format.json { render json: { error: "Failed to delete image" }, status: :unprocessable_entity }
        format.html { redirect_back fallback_location: root_path, alert: "Failed to delete image" }
      end
    end
  rescue ActiveRecord::RecordNotFound
    respond_to do |format|
      format.json { render json: { error: "Image not found" }, status: :not_found }
      format.html { redirect_back fallback_location: root_path, alert: "Image not found" }
    end
  end

  private
  
  def photo_params
    params.require(:photo).permit(:image)
  end
  
  def md_url(url)
    "![](#{url})"
  end
end