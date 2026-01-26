## Error Type

Console Error

## Error Message

In HTML, <button> cannot be a descendant of <button>.
This will cause a hydration error.

...
<Collapsible data-orientation="vertical" data-state="closed" \__scopeCollapsible={{...}} data-slot="accordion-..." ...>
<CollapsibleProvider scope={{...}} disabled={undefined} contentId="radix-\_r_19_" open={false} ...>
<Primitive.div data-state="closed" data-disabled={undefined} data-orientation="vertical" ...>
<div data-state="closed" data-disabled={undefined} data-orientation="vertical" data-slot="accordion-..." ...>
<AccordionTrigger className="hover:no-u...">
<AccordionHeader className="flex">
<Primitive.h3 data-orientation="vertical" data-state="closed" data-disabled={undefined} className="flex" ...>
<h3 data-orientation="vertical" data-state="closed" data-disabled={undefined} className="flex" ...>
<AccordionTrigger data-slot="accordion-..." className={"focus-vi..."}>
<AccordionCollectionItemSlot scope={undefined}>
<AccordionCollectionItemSlot.Slot data-radix-collection-item="" ref={function}>
<AccordionCollectionItemSlot.SlotClone data-radix-collection-item="" ref={function}>
<CollapsibleTrigger aria-disabled={undefined} data-orientation="vertical" id="radix-_r_18_" ...>
<Primitive.button type="button" aria-controls="radix-_r_19_" aria-expanded={false} ...>

>                               <button
>                                 type="button"
>                                 aria-controls="radix-_r_19_"
>                                 aria-expanded={false}
>                                 data-state="closed"
>                                 data-disabled={undefined}
>                                 disabled={undefined}
>                                 aria-disabled={undefined}
>                                 data-orientation="vertical"
>                                 id="radix-_r_18_"
>                                 data-slot="accordion-trigger"
>                                 className={"focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-..."}
>                                 data-radix-collection-item=""
>                                 onClick={function handleEvent}
>                                 ref={function}
>                               >

                                  ...
                                    <CheckboxTrigger className="peer h-4 w..." aria-label="Select all..." ref={null} ...>
                                      <Primitive.button type="button" role="checkbox" aria-checked={false} ...>

>                                       <button
>                                         type="button"
>                                         role="checkbox"
>                                         aria-checked={false}
>                                         aria-required={undefined}
>                                         data-state="unchecked"
>                                         data-disabled={undefined}
>                                         disabled={undefined}
>                                         value="on"
>                                         className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offse..."
>                                         aria-label="Select all modules in Dashboard"
>                                         onKeyDown={function handleEvent}
>                                         onClick={function handleEvent}
>                                         ref={function}
>                                       >

                                    ...
                                  ...
            ...



    at button (<anonymous>:null:null)
    at _c (components/ui/checkbox.tsx:13:3)
    at <unknown> (components/roles/RoleModulesManagement.tsx:684:29)
    at Array.map (<anonymous>:null:null)
    at RoleModulesManagement (components/roles/RoleModulesManagement.tsx:666:18)
    at RoleModulesPage (app/(protected)/access/roles/[id]/modules/page.tsx:127:7)

## Code Frame

11 | React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
12 | >(({ className, ...props }, ref) => (

> 13 | <CheckboxPrimitive.Root

     |   ^

14 | ref={ref}
15 | className={cn(
16 | "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",

Next.js version: 16.1.1 (Turbopack)
