update loads
set status = 'PENDING_APPROVAL'
where status::text = 'PENDING';
